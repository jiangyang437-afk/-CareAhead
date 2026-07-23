import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Patient, VisitEvent } from '../../types'
import { PageHeader } from '../common/PageHeader'
import { VisitStepper } from './VisitStepper'

export function VisitWorkspace({ visit, patient, title, action, children }: { visit: VisitEvent; patient?: Patient; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <>
      <Link className="back-link" to={`/visits/${visit.id}`}>← 返回事件概览</Link>
      <PageHeader title={title} subtitle={`${patient?.displayName ?? '未知患者'} · ${visit.purpose}`} action={action} />
      <VisitStepper visitId={visit.id} />
      {children}
    </>
  )
}
