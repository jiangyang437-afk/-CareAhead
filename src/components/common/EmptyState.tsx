import { Link } from 'react-router-dom'

export function EmptyState({ title, description, actionLabel, actionTo }: { title: string; description: string; actionLabel?: string; actionTo?: string }) {
  return (
    <section className="empty-state">
      <span className="empty-mark" aria-hidden="true">○</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && actionTo && <Link className="button primary" to={actionTo}>{actionLabel}</Link>}
    </section>
  )
}
