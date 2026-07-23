import type { PersistedData } from '../types'
import { SCHEMA_VERSION } from '../services/storageService'

const createdAt = '2026-07-20T08:00:00.000Z'
const updatedAt = '2026-07-22T08:00:00.000Z'

export const demoData: PersistedData = {
  meta: { schemaVersion: SCHEMA_VERSION, lastOpenedVisitId: 'visit-demo-1', demoLoaded: true },
  patients: [
    {
      id: 'patient-demo-1',
      displayName: '林阿姨（演示）',
      relation: '母亲',
      ageRange: '60–69 岁',
      allergies: ['演示：青霉素过敏'],
      medications: [{ id: 'med-demo-1', name: '演示药物 A', dosage: '按医生说明记录' }],
      keyHistory: ['演示：既往信息仅用于界面展示'],
      createdAt,
      updatedAt,
    },
  ],
  visits: [
    {
      id: 'visit-demo-1',
      patientId: 'patient-demo-1',
      visitType: 'outpatient',
      hospital: '春和医院（虚构）',
      department: '综合门诊（演示）',
      date: '2026-07-25T01:30:00.000Z',
      purpose: '复诊并确认后续安排（演示）',
      companion: '主要照护者',
      status: 'preparing',
      progress: 60,
      createdAt,
      updatedAt,
    },
    {
      id: 'visit-demo-inpatient',
      patientId: 'patient-demo-1',
      visitType: 'inpatient',
      hospital: '春和医院（虚构）',
      department: '综合病区（演示）',
      date: '2026-07-21T01:00:00.000Z',
      purpose: '住院事务演示',
      companion: '主要照护者',
      status: 'in_progress',
      progress: 20,
      createdAt,
      updatedAt,
    },
  ],
  symptoms: [
    {
      id: 'symptom-demo-1',
      visitId: 'visit-demo-1',
      startDate: '2026-07-18',
      name: '演示症状记录',
      description: '虚构内容，仅用于展示信息结构。',
      createdAt,
      updatedAt,
    },
  ],
  documents: [
    {
      id: 'document-demo-1',
      patientId: 'patient-demo-1',
      visitId: 'visit-demo-1',
      type: '检查资料',
      title: '演示检查资料（无真实文件）',
      date: '2026-07-19',
      hospital: '春和医院（虚构）',
      createdAt,
      updatedAt,
    },
  ],
  doctorNotes: [
    {
      id: 'note-demo-1',
      visitId: 'visit-demo-1',
      category: 'follow_up',
      content: '演示：用户记录的复查安排，不构成医疗建议。',
      date: '2026-07-22',
      sourceLabel: '用户记录',
      convertedTaskIds: ['task-demo-1'],
      createdAt,
      updatedAt,
    },
  ],
  tasks: [
    {
      id: 'task-demo-1',
      visitId: 'visit-demo-1',
      patientId: 'patient-demo-1',
      type: 'document',
      title: '携带演示检查资料',
      dueDate: '2026-07-25',
      assigneeRole: '主要照护者',
      status: 'pending',
      sourceType: 'doctor_note',
      sourceId: 'note-demo-1',
      createdAt,
      updatedAt,
    },
  ],
  inpatient: {
    tasks: [{ id: 'inpatient-task-demo-1', visitId: 'visit-demo-inpatient', date: '2026-07-22', title: '领取演示资料', assigneeRole: '主要照护者', status: 'pending', note: '虚构事项', createdAt, updatedAt }],
    handoffs: [{ id: 'handoff-demo-1', visitId: 'visit-demo-inpatient', dateTime: '2026-07-22T08:00:00.000Z', changes: '演示：今日情况记录', completed: '已整理随身资料', pending: '等待演示事项', nextDay: '继续核对清单', note: '家属记录，不替代医嘱', createdAt, updatedAt }],
    dischargeItems: [{ id: 'discharge-demo-1', visitId: 'visit-demo-inpatient', category: '材料领取', label: '领取演示出院材料', checked: false, createdAt, updatedAt }],
  },
  drafts: { pageDrafts: {} },
}
