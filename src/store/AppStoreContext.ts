import { createContext, useContext } from 'react'
import type { ActionTaskInput, AppState, DischargeItemInput, DoctorNoteInput, HandoffEntryInput, InpatientTaskInput, MedicalDocumentInput, PatientFormDraft, PatientInput, PreviewRole, SymptomInput, VisitFormDraft, VisitInput, VisitPreparation, VisitStatus } from '../types'

export interface AppStoreValue {
  state: AppState
  loadDemo: () => void
  clearData: () => void
  setPreviewRole: (role: PreviewRole) => void
  savePatient: (input: PatientInput, patientId?: string) => string
  deletePatient: (patientId: string) => boolean
  saveVisit: (input: VisitInput, inheritFromVisitId?: string) => string
  setVisitStatus: (id: string, status: VisitStatus) => boolean
  setPatientDraft: (draft?: PatientFormDraft) => void
  setVisitDraft: (draft?: VisitFormDraft) => void
  updateVisitPreparation: (visitId: string, patch: Partial<VisitPreparation>) => void
  saveSymptom: (input: SymptomInput, symptomId?: string) => string
  deleteSymptom: (id: string) => void
  saveDocument: (input: MedicalDocumentInput, documentId?: string) => string
  deleteDocument: (id: string) => void
  saveDoctorNote: (input: DoctorNoteInput) => string
  deleteDoctorNote: (id: string) => void
  saveTask: (input: ActionTaskInput, taskId?: string) => string
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  convertNoteToTask: (noteId: string, input: ActionTaskInput) => string
  saveInpatientTask: (input: InpatientTaskInput) => string
  assignInpatientTask: (id: string, assigneeRole: string) => void
  toggleInpatientTask: (id: string) => void
  deleteInpatientTask: (id: string) => void
  saveHandoff: (input: HandoffEntryInput, id?: string) => string
  saveDischargeItem: (input: DischargeItemInput) => string
  toggleDischargeItem: (id: string) => void
  deleteDischargeItem: (id: string) => void
  convertDischargeItemToTask: (itemId: string, input: ActionTaskInput) => string
}

export const AppStoreContext = createContext<AppStoreValue | null>(null)

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext)
  if (!value) throw new Error('useAppStore 必须在 AppStoreProvider 内使用。')
  return value
}
