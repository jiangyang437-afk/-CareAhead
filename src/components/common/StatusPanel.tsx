import type { ReactNode } from 'react'

export function StatusPanel({ title, children, tone = 'neutral' }: { title: string; children: ReactNode; tone?: 'neutral' | 'warning' | 'error' }) {
  return (
    <section className={`status-panel ${tone}`}>
      <strong>{title}</strong>
      <div>{children}</div>
    </section>
  )
}
