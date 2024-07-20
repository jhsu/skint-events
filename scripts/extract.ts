import { z } from 'zod';
import { XMLParser } from 'fast-xml-parser';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import fs from 'node:fs'

// Define Zod schemas with descriptions
const SkintEventSchema = z.object({
	title: z.string().describe("Name of the event"),
	description: z.string().describe("Brief description about the event, what or who will be there and what to expect"),
	start_date: z.string().optional().describe("First day of the event, eg '2024-12-01'"),
	start_time: z.string().optional().describe("Time of the event start, eg '6:30 pm'"),
	end_date: z.string().optional().describe("Last day of the event, eg '2024-12-02'"),
	end_time: z.string().optional().describe("Time of the event end, eg '8:00 pm'"),
	link: z.string().url().optional().describe("URL Link to more information about the event or buy tickets. Usually the link follows the event description as an anchor tag on '>>'"),
	address: z.string().optional().describe("Street address of the event or venue name or any location description"),
	cost: z.string().optional().describe("Cost to attend the event in dollars, eg 'Free' or '$10'"),
}).describe("Event information extracted from the post content");

const SkintPostSchema = z.object({
	events: z.array(SkintEventSchema),
}).describe("A list of events extracted from the post content with event information and link to more info");

type SkintEvent = z.infer<typeof SkintEventSchema>;
type SkintPost = z.infer<typeof SkintPostSchema>;

// Function to fetch and parse RSS feed
async function fetchAndParseRSS(url: string): Promise<any> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	const xmlText = await response.text();
	const parser = new XMLParser();
	const result = parser.parse(xmlText);

	if (!result.rss?.channel) {
		throw new Error("Invalid RSS feed format. Missing 'channel' element.");
	}

	const channel = result.rss.channel;
	return {
		title: channel.title,
		link: channel.link,
		description: channel.description,
		lastBuildDate: channel.lastBuildDate,
		items: Array.isArray(channel.item) ? channel.item : [channel.item],
	};
}

// Function to extract event info using AI
async function extractEventInfo(content: string): Promise<SkintEvent[]> {
	const { object } = await generateObject({
		model: openai('gpt-4o-mini'),
		schema: SkintPostSchema,
		prompt: `Extract events information from the following text. Infer the event timestamp, address, and cost if possible. If you can't determine a specific field, leave it as undefined. Here's an example of the content structure:

    <p><span style="font-family:trebuchet ms;">fri 10pm (+ 8/16): <b>str8 west coastin&#8217;</b>: west coast hip-hop vibes take over friends and lovers (crown heights) at this annual dance party spun by djs eleven, raichous, dstrukt, and still life. $5 before 11pm with rsvp, $10 without. </span><a style="font-family: trebuchet ms;" href="https://www.eventbrite.com/e/str8-west-coastin-feat-dj-eleven-x-dstrukt-x-still-life-x-raichous-tickets-919851068307" target="_blank" rel="noopener"><b><font color="#FF6600">>></font color></b></a></p>

    Now, extract the information from this content:

    ${content}`,
	});

	return object.events;
}

// Function to write events to a JSON file
async function writeEventsToFile(events: SkintEvent[], filename: string): Promise<void> {
	try {
		fs.writeFileSync(filename, JSON.stringify(events, null, 2));
		console.log(`Events successfully written to ${filename}`);
	} catch (error) {
		console.error(`Error writing to file: ${error}`);
	}
}

// Main function to process the feed
async function processSkintFeed(url: string): Promise<SkintEvent[]> {
	const feed = await fetchAndParseRSS(url);
	const events: SkintEvent[] = [];

	for (const item of feed.items.slice(0, 1)) {
		const content = `Title: ${item.title}\nDescription: ${item.description?.slice(0, 1000)}\nLink: ${item.link}\nContent: ${item['content:encoded']}`;
		console.log('-------');
		console.log(content);

		try {
			const extractedEvents = await extractEventInfo(content);
			events.push(...extractedEvents);
		} catch (e) {
			console.error(`Error processing item: ${item.title}. Error: ${e}`);
		}
	}

	return events;
}

// Example usage
async function main() {
	const feedUrl = "https://www.theskint.com/feed/";
	const events = await processSkintFeed(feedUrl);

	console.log(`Extracted ${events.length} events:`);
	console.log(JSON.stringify(events, null, 2));

	await writeEventsToFile(events, 'events.json');
}

main().catch(console.error);