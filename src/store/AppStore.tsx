import { useMemo, useReducer, type ReactNode } from 'react'
import { demoData } from '../data/demoData'
import { recalculateAllProgress } from '../domain/progress'
import { canTransitionVisit } from '../domain/visitStatus'
import { clearAll, emptyPersistedData, loadAll, saveAll } from '../services/storageService'
import type { ActionTaskInput, AppState, DischargeItemInput, DoctorNoteInput, HandoffEntryInput, InpatientTaskInput, MedicalDocumentInput, PatientFormDraft, PatientInput, PersistedData, PreviewRole, SymptomInput, VisitFormDraft, VisitInput, VisitPreparation, VisitStatus } from '../types'
import { AppStoreContext, type AppStoreValue } from './AppStoreContext'

type Action =
  | { type: 'replace'; data: PersistedData }
  | { type: 'storage-error'; message: string }
  | { type: 'set-role'; role: PreviewRole }

const toState = (data: PersistedData): AppState => ({
  ...data,
  loadStatus: 'ready',
  saveState: 'idle',
  previewRole: 'primary',
})

const toPersisted = (state: AppState): PersistedData => ({
  meta: state.meta,
  patients: state.patients,
  visits: state.visits,
  symptoms: state.symptoms,
  documents: state.documents,
  doctorNotes: state.doctorNotes,
  tasks: state.tasks,
  inpatient: state.inpatient,
  drafts: state.drafts,
})

const initialState = (): AppState => {
  try {
    return toState(loadAll())
  } catch (error) {
    return {
      ...emptyPersistedData(),
      loadStatus: 'corrupted',
      saveState: 'error',
      storageError: error instanceof Error ? error.message : '本地数据无法读取。',
      previewRole: 'primary',
    }
  }
}

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'replace':
      return { ...toState(action.data), saveState: 'saved', lastSavedAt: new Date().toISOString(), previewRole: state.previewRole }
    case 'storage-error':
      return { ...state, saveState: 'error', storageError: action.message }
    case 'set-role':
      return { ...state, previewRole: action.role }
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  const value = useMemo<AppStoreValue>(() => {
    const commit = (data: PersistedData) => {
      try {
        const recalculated = recalculateAllProgress(data)
        saveAll(recalculated)
        dispatch({ type: 'replace', data: recalculated })
      } catch (error) {
        const message = error instanceof Error ? error.message : '本地数据保存失败。'
        dispatch({ type: 'storage-error', message })
        throw new Error(message)
      }
    }

    const updateDrafts = (drafts: PersistedData['drafts']) => commit({ ...toPersisted(state), drafts })

    return {
      state,
      loadDemo: () => commit(demoData),
      clearData: () => {
        try {
          clearAll()
          commit(emptyPersistedData())
        } catch (error) {
          dispatch({ type: 'storage-error', message: error instanceof Error ? error.message : '本地数据清除失败。' })
        }
      },
      setPreviewRole: (role) => dispatch({ type: 'set-role', role }),
      savePatient: (input: PatientInput, patientId?: string) => {
        const now = new Date().toISOString()
        const existing = state.patients.find((patient) => patient.id === patientId)
        const id = existing?.id ?? crypto.randomUUID()
        const patient = {
          ...input,
          id,
          medications: input.medications.map((medication, index) => ({
            ...medication,
            id: existing?.medications[index]?.id ?? crypto.randomUUID(),
          })),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        const patients = existing
          ? state.patients.map((item) => item.id === id ? patient : item)
          : [...state.patients, patient]
        commit({ ...toPersisted(state), patients, drafts: { ...state.drafts, patientForm: undefined } })
        return id
      },
      deletePatient: (patientId: string) => {
        if (state.visits.some((visit) => visit.patientId === patientId) || state.documents.some((document) => document.patientId === patientId)) return false
        commit({
          ...toPersisted(state),
          patients: state.patients.filter((patient) => patient.id !== patientId),
        })
        return true
      },
      saveVisit: (input: VisitInput, inheritFromVisitId?: string) => {
        const now = new Date().toISOString()
        const id = crypto.randomUUID()
        const sourceVisit = inheritFromVisitId
          ? state.visits.find((item) => item.id === inheritFromVisitId && item.patientId === input.patientId)
          : undefined
        const visit = {
          ...input,
          id,
          status: 'preparing' as const,
          progress: 20,
          preparation: {
            patientInfoConfirmed: false,
            materialsConfirmed: false,
            materials: [],
            questions: [],
            noNewSymptoms: false,
            noDocuments: false,
            noQuestions: false,
            noDoctorNotes: false,
            noTasks: false,
          },
          createdAt: now,
          updatedAt: now,
        }
        const inheritedDocuments = sourceVisit
          ? state.documents.filter((item) => item.visitId === sourceVisit.id).map((item) => ({
            ...item,
            id: crypto.randomUUID(),
            visitId: id,
            patientId: input.patientId,
            createdAt: now,
            updatedAt: now,
          }))
          : []
        const inheritedTasks = sourceVisit
          ? state.tasks.filter((item) => item.visitId === sourceVisit.id && item.status === 'pending').map((item) => ({
            ...item,
            id: crypto.randomUUID(),
            visitId: id,
            patientId: input.patientId,
            sourceType: 'inherited' as const,
            sourceId: item.id,
            status: 'pending' as const,
            createdAt: now,
            updatedAt: now,
          }))
          : []
        commit({
          ...toPersisted(state),
          meta: { ...state.meta, lastOpenedVisitId: id },
          visits: [...state.visits, visit],
          documents: [...state.documents, ...inheritedDocuments],
          tasks: [...state.tasks, ...inheritedTasks],
          drafts: { ...state.drafts, visitForm: undefined },
        })
        return id
      },
      setVisitStatus: (id: string, status: VisitStatus) => {
        const current = state.visits.find((item) => item.id === id)
        if (!current || !canTransitionVisit(current.status, status)) return false
        commit({
          ...toPersisted(state),
          visits: state.visits.map((item) => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item),
        })
        return true
      },
      setPatientDraft: (draft?: PatientFormDraft) => updateDrafts({ ...state.drafts, patientForm: draft }),
      setVisitDraft: (draft?: VisitFormDraft) => updateDrafts({ ...state.drafts, visitForm: draft }),
      updateVisitPreparation: (visitId: string, patch: Partial<VisitPreparation>) => {
        const visits = state.visits.map((visit) => visit.id === visitId ? {
          ...visit,
          preparation: { ...emptyPreparation(), ...visit.preparation, ...patch },
          updatedAt: new Date().toISOString(),
        } : visit)
        commit({ ...toPersisted(state), visits })
      },
      saveSymptom: (input: SymptomInput, symptomId?: string) => {
        const now = new Date().toISOString()
        const existing = state.symptoms.find((item) => item.id === symptomId)
        const id = existing?.id ?? crypto.randomUUID()
        const symptom = { ...input, id, createdAt: existing?.createdAt ?? now, updatedAt: now }
        commit({ ...toPersisted(state), symptoms: existing ? state.symptoms.map((item) => item.id === id ? symptom : item) : [...state.symptoms, symptom], visits: state.visits.map((visit) => visit.id === input.visitId ? { ...visit, preparation: { ...emptyPreparation(), ...visit.preparation, noNewSymptoms: false } } : visit) })
        return id
      },
      deleteSymptom: (id: string) => commit({ ...toPersisted(state), symptoms: state.symptoms.filter((item) => item.id !== id) }),
      saveDocument: (input: MedicalDocumentInput, documentId?: string) => {
        const visit = state.visits.find((item) => item.id === input.visitId)
        if (!visit) throw new Error('无法为不存在的就医事件保存资料。')
        const now = new Date().toISOString()
        const existing = state.documents.find((item) => item.id === documentId)
        const id = existing?.id ?? crypto.randomUUID()
        const document = { ...input, patientId: visit.patientId, id, createdAt: existing?.createdAt ?? now, updatedAt: now }
        commit({ ...toPersisted(state), documents: existing ? state.documents.map((item) => item.id === id ? document : item) : [...state.documents, document], visits: state.visits.map((item) => item.id === visit.id ? { ...item, preparation: { ...emptyPreparation(), ...item.preparation, noDocuments: false } } : item) })
        return id
      },
      deleteDocument: (id: string) => commit({ ...toPersisted(state), documents: state.documents.filter((item) => item.id !== id) }),
      saveDoctorNote: (input: DoctorNoteInput) => {
        const now = new Date().toISOString()
        const id = crypto.randomUUID()
        commit({ ...toPersisted(state), doctorNotes: [...state.doctorNotes, { ...input, id, sourceLabel: '用户记录', convertedTaskIds: [], createdAt: now, updatedAt: now }] })
        return id
      },
      deleteDoctorNote: (id: string) => commit({
        ...toPersisted(state),
        doctorNotes: state.doctorNotes.filter((item) => item.id !== id),
        tasks: state.tasks.map((task) => task.sourceId === id ? { ...task, sourceType: 'manual' as const, sourceId: undefined } : task),
      }),
      saveTask: (input: ActionTaskInput, taskId?: string) => {
        const now = new Date().toISOString()
        const existing = state.tasks.find((item) => item.id === taskId)
        const id = existing?.id ?? crypto.randomUUID()
        const task = { ...existing, ...input, id, status: existing?.status ?? 'pending' as const, createdAt: existing?.createdAt ?? now, updatedAt: now }
        commit({ ...toPersisted(state), tasks: existing ? state.tasks.map((item) => item.id === id ? task : item) : [...state.tasks, task], visits: state.visits.map((visit) => visit.id === input.visitId ? { ...visit, preparation: { ...emptyPreparation(), ...visit.preparation, noTasks: false } } : visit) })
        return id
      },
      toggleTask: (id: string) => commit({
        ...toPersisted(state),
        tasks: state.tasks.map((task) => task.id === id ? { ...task, status: task.status === 'pending' ? 'completed' as const : 'pending' as const, updatedAt: new Date().toISOString() } : task),
      }),
      deleteTask: (id: string) => commit({
        ...toPersisted(state),
        tasks: state.tasks.filter((task) => task.id !== id),
        doctorNotes: state.doctorNotes.map((note) => ({ ...note, convertedTaskIds: note.convertedTaskIds.filter((taskId) => taskId !== id) })),
      }),
      convertNoteToTask: (noteId: string, input: ActionTaskInput) => {
        const note = state.doctorNotes.find((item) => item.id === noteId)
        if (!note) throw new Error('医生说明记录不存在。')
        const now = new Date().toISOString()
        const id = crypto.randomUUID()
        const task = { ...input, sourceType: 'doctor_note' as const, sourceId: noteId, id, status: 'pending' as const, createdAt: now, updatedAt: now }
        commit({
          ...toPersisted(state),
          tasks: [...state.tasks, task],
          doctorNotes: state.doctorNotes.map((item) => item.id === noteId ? { ...item, convertedTaskIds: [...item.convertedTaskIds, id], updatedAt: now } : item),
        })
        return id
      },
      saveInpatientTask: (input: InpatientTaskInput) => {
        if (!state.visits.some((visit) => visit.id === input.visitId && visit.visitType === 'inpatient')) throw new Error('仅住院事件可保存住院任务。')
        const now = new Date().toISOString()
        const id = crypto.randomUUID()
        commit({ ...toPersisted(state), inpatient: { ...state.inpatient, tasks: [...state.inpatient.tasks, { ...input, id, status: 'pending', createdAt: now, updatedAt: now }] } })
        return id
      },
      assignInpatientTask: (id: string, assigneeRole: string) => commit({
        ...toPersisted(state),
        inpatient: { ...state.inpatient, tasks: state.inpatient.tasks.map((item) => item.id === id ? { ...item, assigneeRole: assigneeRole.trim() || undefined, updatedAt: new Date().toISOString() } : item) },
      }),
      toggleInpatientTask: (id: string) => commit({
        ...toPersisted(state),
        inpatient: { ...state.inpatient, tasks: state.inpatient.tasks.map((item) => item.id === id ? { ...item, status: item.status === 'pending' ? 'completed' as const : 'pending' as const, updatedAt: new Date().toISOString() } : item) },
      }),
      deleteInpatientTask: (id: string) => commit({
        ...toPersisted(state),
        inpatient: { ...state.inpatient, tasks: state.inpatient.tasks.filter((item) => item.id !== id) },
      }),
      saveHandoff: (input: HandoffEntryInput, handoffId?: string) => {
        if (!state.visits.some((visit) => visit.id === input.visitId && visit.visitType === 'inpatient')) throw new Error('仅住院事件可保存陪护交接。')
        const now = new Date().toISOString()
        const existing = state.inpatient.handoffs.find((item) => item.id === handoffId)
        const id = existing?.id ?? crypto.randomUUID()
        const handoff = { ...input, id, createdAt: existing?.createdAt ?? now, updatedAt: now }
        const handoffs = existing ? state.inpatient.handoffs.map((item) => item.id === id ? handoff : item) : [...state.inpatient.handoffs, handoff]
        commit({ ...toPersisted(state), inpatient: { ...state.inpatient, handoffs } })
        return id
      },
      saveDischargeItem: (input: DischargeItemInput) => {
        if (!state.visits.some((visit) => visit.id === input.visitId && visit.visitType === 'inpatient')) throw new Error('仅住院事件可保存出院清单。')
        const now = new Date().toISOString()
        const id = crypto.randomUUID()
        commit({ ...toPersisted(state), inpatient: { ...state.inpatient, dischargeItems: [...state.inpatient.dischargeItems, { ...input, id, checked: false, createdAt: now, updatedAt: now }] } })
        return id
      },
      toggleDischargeItem: (id: string) => commit({
        ...toPersisted(state),
        inpatient: { ...state.inpatient, dischargeItems: state.inpatient.dischargeItems.map((item) => item.id === id ? { ...item, checked: !item.checked, updatedAt: new Date().toISOString() } : item) },
      }),
      deleteDischargeItem: (id: string) => commit({
        ...toPersisted(state),
        inpatient: { ...state.inpatient, dischargeItems: state.inpatient.dischargeItems.filter((item) => item.id !== id) },
      }),
      convertDischargeItemToTask: (itemId: string, input: ActionTaskInput) => {
        const item = state.inpatient.dischargeItems.find((entry) => entry.id === itemId)
        if (!item) throw new Error('出院清单条目不存在。')
        if (item.convertedTaskId && state.tasks.some((task) => task.id === item.convertedTaskId)) return item.convertedTaskId
        const now = new Date().toISOString()
        const id = crypto.randomUUID()
        const task = { ...input, sourceType: 'discharge' as const, sourceId: itemId, id, status: 'pending' as const, createdAt: now, updatedAt: now }
        commit({
          ...toPersisted(state),
          tasks: [...state.tasks, task],
          inpatient: { ...state.inpatient, dischargeItems: state.inpatient.dischargeItems.map((entry) => entry.id === itemId ? { ...entry, convertedTaskId: id, updatedAt: now } : entry) },
        })
        return id
      },
    }
  }, [state])

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

const emptyPreparation = (): VisitPreparation => ({
  patientInfoConfirmed: false,
  materialsConfirmed: false,
  materials: [],
  questions: [],
  noNewSymptoms: false,
  noDocuments: false,
  noQuestions: false,
  noDoctorNotes: false,
  noTasks: false,
})
