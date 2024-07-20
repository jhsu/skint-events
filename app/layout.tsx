import { Fraunces } from 'next/font/google'
import { Work_Sans } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'

const fontHeading = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
})

const fontBody = Work_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
})

export default function Layout({ children }: { children?: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={cn(
          'antialiased',
          fontHeading.variable,
          fontBody.variable
        )}
      >
        {children}
      </body>
    </html>
  )
}
