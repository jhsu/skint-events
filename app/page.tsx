import { EventList } from "@/components/component/event-list";

import fs from 'node:fs'

async function loadEvents() {
  'use server'
  const events = await fs.promises.readFile('../events.json')
  return JSON.parse(events.toString())
}

export default async function Home() {
  const events = await loadEvents()
  return (
    <main>
      <EventList events={events} />
    </main>
  );
}
