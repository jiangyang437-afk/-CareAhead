import type { PersistedData, VisitEvent } from '../types'

export function calculateVisitProgress(data: PersistedData, visit: VisitEvent): number {
  let progress = visit.patientId && visit.visitType && visit.date && visit.purpose ? 20 : 0
  const prep = visit.preparation
  if (prep?.patientInfoConfirmed) progress += 15
  const hasPrepContent = data.symptoms.some((item) => item.visitId === visit.id)
    || data.documents.some((item) => item.visitId === visit.id)
    || Boolean(prep?.questions.length)
    || Boolean(prep?.noNewSymptoms && prep.noDocuments && prep.noQuestions)
  if (hasPrepContent && prep?.materialsConfirmed) progress += 25
  if (data.doctorNotes.some((item) => item.visitId === visit.id) || prep?.noDoctorNotes) progress += 20
  if (data.tasks.some((item) => item.visitId === visit.id) || prep?.noTasks) progress += 20
  return progress
}

export function recalculateAllProgress(data: PersistedData): PersistedData {
  const visits = data.visits.map((visit) => ({ ...visit, progress: calculateVisitProgress(data, visit) }))
  return { ...data, visits }
}
