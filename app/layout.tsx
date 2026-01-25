import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Reminders - Slack Task Reminder System',
  description: 'Manage and send reminders to Slack channels',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
