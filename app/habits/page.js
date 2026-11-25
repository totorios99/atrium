import Link from 'next/link'
import HabitsPanel from '@/components/HabitsPanel.jsx'

export const metadata = { title: 'Habits' }

// The detail behind the Today panel: 26 weeks per habit.
export default function HabitsPage() {
  return (
    <>
      <div className="backdrop" />
      <main className="shell habits-page">
        <Link className="ghost-btn" href="/">← atrium</Link>
        <HabitsPanel />
      </main>
    </>
  )
}
