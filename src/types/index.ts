export type ISODateString = string
export type VisitType = 'outpatient' | 'follow_up' | 'inpatient'
export type VisitStatus = 'draft' | 'preparing' | 'in_progress' | 'follow_up' | 'completed' | 'archived'
export type TaskStatus = 'pending' | 'completed'
export type TaskType = 'medication' | 'exam' | 'follow_up' | 'document' | 'errand'
export type NoteCategory = 'exam' | 'medication' | 'precaution' | 'follow_up' | 'question'
export type PreviewRole = 'primary' | 'remoteFamily' | 'companion' | 'redacted'
export type LoadStatus = 'loading' | 'ready' | 'corrupted'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface EntityBase {
  id: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface Medication {
  id: string
  name: string
  dosage?: string
  frequency?: string
  note?: string
}

export interface EmergencyContact {
  name: string
  phone?: string
  relation?: string
}

export interface Patient extends EntityBase {
  displayName: string
  relation: string
  ageRange?: string
  allergies: string[]
  medications: Medication[]
  keyHistory: string[]
  emergencyContact?: EmergencyContact
}

export interface VisitEvent extends EntityBase {
  patientId: string
  visitType: VisitType
  hospital?: string
  department?: string
  date: ISODateString
  purpose: string
  companion?: string
  status: VisitStatus
  progress: number
  preparation?: VisitPreparation
}

export interface PrepMaterial {
  id: string
  label: string
  checked: boolean
  custom: boolean
}

export interface VisitPreparation {
  patientInfoConfirmed: boolean
  materialsConfirmed: boolean
  materials: PrepMaterial[]
  questions: string[]
  noNewSymptoms: boolean
  noDocuments: boolean
  noQuestions: boolean
  noDoctorNotes: boolean
  noTasks: boolean
}

export interface Symptom extends EntityBase {
  visitId: string
  startDate?: ISODateString
  name: string
  description?: string
  duration?: string
  trigger?: string
  relief?: string
  relatedExam?: string
}

export interface MedicalDocument extends EntityBase {
  patientId: string
  visitId?: string
  type: string
  title: string
  date?: ISODateString
  hospital?: string
  note?: string
  localImageRef?: string
}

export interface DoctorNote extends EntityBase {
  visitId: string
  category: NoteCategory
  content: string
  date: ISODateString
  sourceLabel: string
  convertedTaskIds: string[]
}

export interface ActionTask extends EntityBase {
  visitId: string
  patientId: string
  type: TaskType
  title: string
  dueDate?: ISODateString
  assigneeRole?: string
  status: TaskStatus
  sourceType: 'manual' | 'doctor_note' | 'discharge' | 'inherited'
  sourceId?: string
  note?: string
}

export interface InpatientTask extends EntityBase {
  visitId: string
  date: ISODateString
  title: string
  assigneeRole?: string
  deadline?: ISODateString
  status: TaskStatus
  note?: string
}

export interface HandoffEntry extends EntityBase {
  visitId: string
  dateTime: ISODateString
  changes: string
  completed: string
  pending: string
  nextDay: string
  note?: string
}

export interface DischargeItem extends EntityBase {
  visitId: string
  category: string
  label: string
  checked: boolean
  convertedTaskId?: string
}

export interface AppMeta {
  schemaVersion: number
  lastOpenedVisitId?: string
  demoLoaded: boolean
}

export interface DraftState {
  patientForm?: PatientFormDraft
  visitForm?: VisitFormDraft
  pageDrafts: Record<string, unknown>
}

export interface PatientFormDraft {
  patientId?: string
  displayName: string
  relation: string
  ageRange?: string
  allergies: string
  medications: string
  keyHistory: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelation: string
}

export interface VisitFormDraft {
  patientId?: string
  followUpFromVisitId?: string
  visitType?: VisitType
  date?: ISODateString
  purpose: string
  hospital?: string
  department?: string
  companion?: string
}

export type PatientInput = Omit<Patient, keyof EntityBase | 'medications' | 'allergies' | 'keyHistory'> & {
  allergies: string[]
  medications: Omit<Medication, 'id'>[]
  keyHistory: string[]
}

export type VisitInput = Pick<VisitEvent, 'patientId' | 'visitType' | 'date' | 'purpose' | 'hospital' | 'department' | 'companion'>

export type SymptomInput = Omit<Symptom, keyof EntityBase>
export type MedicalDocumentInput = Omit<MedicalDocument, keyof EntityBase | 'patientId'>
export type DoctorNoteInput = Omit<DoctorNote, keyof EntityBase | 'convertedTaskIds' | 'sourceLabel'>
export type ActionTaskInput = Omit<ActionTask, keyof EntityBase | 'status'>
export type InpatientTaskInput = Omit<InpatientTask, keyof EntityBase | 'status'>
export type HandoffEntryInput = Omit<HandoffEntry, keyof EntityBase>
export type DischargeItemInput = Omit<DischargeItem, keyof EntityBase | 'checked' | 'convertedTaskId'>

export interface InpatientData {
  tasks: InpatientTask[]
  handoffs: HandoffEntry[]
  dischargeItems: DischargeItem[]
}

export interface PersistedData {
  meta: AppMeta
  patients: Patient[]
  visits: VisitEvent[]
  symptoms: Symptom[]
  documents: MedicalDocument[]
  doctorNotes: DoctorNote[]
  tasks: ActionTask[]
  inpatient: InpatientData
  drafts: DraftState
}

export interface AppState extends PersistedData {
  loadStatus: LoadStatus
  saveState: SaveState
  lastSavedAt?: ISODateString
  storageError?: string
  previewRole: PreviewRole
}
