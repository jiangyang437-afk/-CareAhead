import type { VisitStatus } from '../types'

const transitions: Record<VisitStatus, VisitStatus[]> = {
  draft: ['preparing'],
  preparing: ['in_progress'],
  in_progress: ['follow_up'],
  follow_up: ['completed'],
  completed: ['archived'],
  archived: ['completed'],
}

export function canTransitionVisit(from: VisitStatus, to: VisitStatus): boolean {
  return transitions[from].includes(to)
}

