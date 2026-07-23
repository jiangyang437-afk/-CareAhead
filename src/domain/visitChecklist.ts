import type { AppState, VisitEvent } from '../types'

export interface VisitChecklistItem {
  id: string
  label: string
  hint: string
  to: string
  complete: boolean
}

export function buildVisitChecklist(state: AppState, visit: VisitEvent): VisitChecklistItem[] {
  const prep = visit.preparation
  const symptomsAnswered = state.symptoms.some((item) => item.visitId === visit.id) || Boolean(prep?.noNewSymptoms)
  const documentsAnswered = state.documents.some((item) => item.visitId === visit.id) || Boolean(prep?.noDocuments)
  const questionsAnswered = Boolean(prep?.questions.length) || Boolean(prep?.noQuestions)
  const prepComplete = symptomsAnswered && documentsAnswered && questionsAnswered && Boolean(prep?.materialsConfirmed)

  return [
    { id: 'base', label: '确认本次就医信息', hint: '患者、日期、类型和就医目的', to: `/visits/${visit.id}`, complete: Boolean(visit.patientId && visit.visitType && visit.date && visit.purpose) },
    { id: 'patient', label: '核对患者关键信息', hint: '过敏、当前用药和关键病史', to: `/visits/${visit.id}/prep`, complete: Boolean(prep?.patientInfoConfirmed) },
    { id: 'prep', label: '整理诊前材料与问题', hint: '四个小节均已回应后才算完成', to: `/visits/${visit.id}/prep`, complete: prepComplete },
    { id: 'notes', label: '记录医生说明', hint: '只记录原始要求，不做医学解释', to: `/visits/${visit.id}/notes`, complete: state.doctorNotes.some((item) => item.visitId === visit.id) || Boolean(prep?.noDoctorNotes) },
    { id: 'tasks', label: '确认诊后行动', hint: '用药、检查、复查和资料事项', to: `/visits/${visit.id}/tasks`, complete: state.tasks.some((item) => item.visitId === visit.id) || Boolean(prep?.noTasks) },
  ]
}
