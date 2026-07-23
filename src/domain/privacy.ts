import type { AppState, PreviewRole } from '../types'

export interface PreviewSection {
  title: string
  items: string[]
}

export interface RolePreview {
  title: string
  identity: string
  eventLine: string
  hiddenSummary: string
  sections: PreviewSection[]
}

const present = (items: Array<string | undefined>) => items.filter(Boolean) as string[]

export function buildRolePreview(state: AppState, visitId: string, role: PreviewRole): RolePreview | undefined {
  const visit = state.visits.find((item) => item.id === visitId)
  if (!visit) return undefined
  const patient = state.patients.find((item) => item.id === visit.patientId)
  if (!patient) return undefined

  const symptoms = state.symptoms.filter((item) => item.visitId === visitId)
  const documents = state.documents.filter((item) => item.visitId === visitId)
  const notes = state.doctorNotes.filter((item) => item.visitId === visitId)
  const questions = visit.preparation?.questions ?? []
  const tasks = state.tasks.filter((item) => item.visitId === visitId)
  const emergency = patient.emergencyContact
    ? `${patient.emergencyContact.name}（${patient.emergencyContact.relation}）${patient.emergencyContact.phone}`
    : undefined
  const location = present([visit.hospital, visit.department]).join(' · ') || '地点待补充'
  const eventLine = `${visit.date || '日期待补充'} · ${location} · 准备度 ${visit.progress}%`

  if (role === 'remoteFamily') {
    const assigned = tasks.filter((item) => /远程|家属|remote/i.test(item.assigneeRole || ''))
    return {
      title: '远程家属视图',
      identity: patient.displayName,
      eventLine,
      hiddenSummary: '已隐藏详细病史、检查资料、敏感说明和联系方式。',
      sections: [
        { title: '关键进展', items: notes.map((item) => item.content) },
        { title: '分配给远程家属的任务', items: assigned.map((item) => `${item.title}（${item.status === 'completed' ? '已完成' : '待完成'}）`) },
      ],
    }
  }

  if (role === 'companion') {
    const assigned = tasks.filter((item) => /陪诊/i.test(item.assigneeRole || ''))
    return {
      title: '陪诊员视图',
      identity: patient.displayName,
      eventLine,
      hiddenSummary: '已隐藏详细病史、医疗资料和家庭内部说明。',
      sections: [
        { title: '已备材料', items: documents.map((item) => item.title) },
        { title: '陪诊任务', items: assigned.map((item) => `${item.title}（${item.status === 'completed' ? '已完成' : '待完成'}）`) },
        { title: '紧急联系人', items: present([emergency]) },
      ],
    }
  }

  if (role === 'redacted') {
    return {
      title: '脱敏导出预览',
      identity: '患者（已脱敏）',
      eventLine,
      hiddenSummary: '已移除姓名、关系、电话和紧急联系人等身份信息。',
      sections: [
        { title: '症状', items: symptoms.map((item) => `${item.name}：${item.description || '暂无补充'}`) },
        { title: '过敏与用药', items: [...patient.allergies.map((item) => `过敏：${item}`), ...patient.medications.map((item) => `用药：${item.name} ${item.dosage || ''}`.trim())] },
        { title: '问题清单', items: questions },
        { title: '医生说明', items: notes.map((item) => item.content) },
        { title: '行动任务', items: tasks.map((item) => `${item.title}（${item.status === 'completed' ? '已完成' : '待完成'}）`) },
      ],
    }
  }

  return {
    title: '主要照护者视图',
    identity: `${patient.displayName}${patient.relation ? ` · ${patient.relation}` : ''}`,
    eventLine,
    hiddenSummary: '主要照护者可查看本机中的完整事件信息。',
    sections: [
      { title: '患者信息', items: present([patient.ageRange, ...patient.allergies.map((item) => `过敏：${item}`), ...patient.medications.map((item) => `用药：${item.name} ${item.dosage || ''}`.trim()), ...patient.keyHistory, emergency]) },
      { title: '医生说明', items: notes.map((item) => item.content) },
      { title: '医疗资料', items: documents.map((item) => item.title) },
      { title: '问题清单', items: questions },
      { title: '行动任务', items: tasks.map((item) => `${item.title}（${item.status === 'completed' ? '已完成' : '待完成'}）`) },
    ],
  }
}
