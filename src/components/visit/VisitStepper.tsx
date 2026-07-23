import { NavLink } from 'react-router-dom'

const steps = [
  { suffix: '', label: '概览' },
  { suffix: '/prep', label: '诊前准备' },
  { suffix: '/notes', label: '医生说明' },
  { suffix: '/tasks', label: '行动清单' },
  { suffix: '/summary', label: '摘要' },
]

export function VisitStepper({ visitId }: { visitId: string }) {
  return (
    <nav className="visit-stepper" aria-label="事件步骤">
      {steps.map((step, index) => (
        <NavLink key={step.label} end={step.suffix === ''} to={`/visits/${visitId}${step.suffix}`}>
          <span>{index + 1}</span>{step.label}
        </NavLink>
      ))}
    </nav>
  )
}
