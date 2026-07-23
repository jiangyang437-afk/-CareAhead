import type { PersistedData } from '../types'

export const SCHEMA_VERSION = 1

export const STORAGE_KEYS = {
  meta: 'zqy.app.meta',
  patients: 'zqy.patients',
  visits: 'zqy.visits',
  symptoms: 'zqy.symptoms',
  documents: 'zqy.documents',
  doctorNotes: 'zqy.doctorNotes',
  tasks: 'zqy.tasks',
  inpatient: 'zqy.inpatient',
  drafts: 'zqy.drafts',
} as const satisfies Record<keyof PersistedData, string>

export const emptyPersistedData = (): PersistedData => ({
  meta: { schemaVersion: SCHEMA_VERSION, demoLoaded: false },
  patients: [],
  visits: [],
  symptoms: [],
  documents: [],
  doctorNotes: [],
  tasks: [],
  inpatient: { tasks: [], handoffs: [], dischargeItems: [] },
  drafts: { pageDrafts: {} },
})

const readValue = <K extends keyof PersistedData>(key: K, fallback: PersistedData[K]): PersistedData[K] => {
  const raw = window.localStorage.getItem(STORAGE_KEYS[key])
  return raw === null ? fallback : (JSON.parse(raw) as PersistedData[K])
}

export const loadAll = (): PersistedData => {
  const empty = emptyPersistedData()
  const meta = readValue('meta', empty.meta)
  if (meta.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`本地数据版本 ${meta.schemaVersion} 与当前版本 ${SCHEMA_VERSION} 不兼容。`)
  }
  return {
    meta,
    patients: readValue('patients', empty.patients),
    visits: readValue('visits', empty.visits),
    symptoms: readValue('symptoms', empty.symptoms),
    documents: readValue('documents', empty.documents),
    doctorNotes: readValue('doctorNotes', empty.doctorNotes),
    tasks: readValue('tasks', empty.tasks),
    inpatient: readValue('inpatient', empty.inpatient),
    drafts: readValue('drafts', empty.drafts),
  }
}

export const saveAll = (data: PersistedData): void => {
  ;(Object.keys(STORAGE_KEYS) as (keyof PersistedData)[]).forEach((key) => {
    window.localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data[key]))
  })
}

export const clearAll = (): void => {
  Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key))
}
