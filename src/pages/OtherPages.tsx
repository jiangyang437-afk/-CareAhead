import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeader } from '../components/common/PageHeader'
import { RecordNotFound } from '../components/common/RecordNotFound'
import { StatusPanel } from '../components/common/StatusPanel'
import { buildRolePreview } from '../domain/privacy'
import { useAppStore } from '../store/AppStoreContext'
import { selectPatient, selectVisit } from '../store/selectors'
import type { PreviewRole } from '../types'

export function HistoryPage() {
  const { state } = useAppStore()
  const [query, setQuery] = useState('')
  const [patientId, setPatientId] = useState('all')
  const [status, setStatus] = useState('all')
  const statusLabels: Record<string, string> = { draft: '草稿', preparing: '诊前准备中', in_progress: '进行中', follow_up: '诊后执行中', completed: '已完成', archived: '已归档' }
  const typeLabels: Record<string, string> = { outpatient: '门诊', follow_up: '复诊', inpatient: '住院' }
  const normalized = query.trim().toLocaleLowerCase('zh-CN')
  const visits = [...state.visits].filter((visit) => {
    const patient = selectPatient(state, visit.patientId)
    const searchable = [patient?.displayName, visit.purpose, visit.hospital, visit.department].filter(Boolean).join(' ').toLocaleLowerCase('zh-CN')
    return (patientId === 'all' || visit.patientId === patientId) && (status === 'all' || visit.status === status) && (!normalized || searchable.includes(normalized))
  }).sort((a, b) => b.date.localeCompare(a.date))
  return <><PageHeader title="历史记录" subtitle="跨家庭成员检索全部事件，包括用户主动隐藏的归档事件。" /><section className="card compact-form"><label className="wide">搜索<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="患者、目的、医院或科室" /></label><label>家庭成员<select value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="all">全部成员</option>{state.patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.displayName}</option>)}</select></label><label>状态<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部状态</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></section>{!state.visits.length ? <EmptyState title="暂无历史记录" description="完成或建立就医事件后，可在这里跨患者回看。" actionLabel="创建事件" actionTo="/visits/new" /> : visits.length ? <><p className="muted">找到 {visits.length} 个事件</p><div className="card-grid">{visits.map((visit) => <Link className="card linked-card" to={`/visits/${visit.id}`} key={visit.id}><span className="eyebrow">{typeLabels[visit.visitType]} · {statusLabels[visit.status]}</span><h2>{selectPatient(state, visit.patientId)?.displayName ?? '未知患者'}</h2><p>{visit.purpose}</p><small>{new Date(visit.date).toLocaleDateString('zh-CN')}</small></Link>)}</div></> : <EmptyState title="没有匹配的事件" description="请调整搜索词、家庭成员或状态筛选。" />}</>
}

const roleLabels: Record<PreviewRole, string> = { primary: '主要照护者', remoteFamily: '远程家属', companion: '陪诊员', redacted: '隐藏身份信息预览' }

export function SettingsPage() {
  const { state, loadDemo, clearData, setPreviewRole } = useAppStore()
  const clear = () => {
    const answer = window.prompt(`将永久清除 ${state.patients.length} 位家庭成员和 ${state.visits.length} 个就医事件。请输入“清空”确认。`)
    if (answer === '清空') clearData()
  }
  const savedText = state.lastSavedAt ? new Date(state.lastSavedAt).toLocaleString('zh-CN') : '本次打开后尚未修改'
  return <><PageHeader title="设置与隐私" subtitle="数据默认保存在当前浏览器，不上传服务器。" /><div className="card-grid"><section className="card"><h2>本地数据</h2><p>{state.patients.length} 位家庭成员 · {state.visits.length} 个就医事件</p><p className="muted">最后保存：{savedText}</p><div className="local-data-note"><strong>请注意</strong><span>清理浏览器数据或更换设备后，这些记录无法自动恢复。</span></div><div className="button-row"><button className="button secondary" onClick={loadDemo}>{state.meta.demoLoaded ? '重置演示数据' : '加载演示数据'}</button><button className="button danger" onClick={clear}>清空全部数据</button></div>{state.saveState === 'error' && <p className="error-text">{state.storageError}</p>}</section><section className="card"><h2>查看范围预览</h2><label>预览身份<select value={state.previewRole} onChange={(event) => setPreviewRole(event.target.value as PreviewRole)}>{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><p className="muted">用于查看不同身份能够看到哪些字段，仅在当前设备上模拟，不会生成链接或导出文件。</p>{state.meta.lastOpenedVisitId && <Link className="button secondary" to={`/share-preview/${state.meta.lastOpenedVisitId}`}>查看当前预览</Link>}</section></div><StatusPanel title="医疗边界" tone="warning"><p>本工具不提供诊断、报告解读、用药建议、在线问诊或急诊判断，且该提示不可关闭。</p></StatusPanel></>
}

export function SharePreviewPage() {
  const { visitId } = useParams(); const { state, setPreviewRole } = useAppStore(); const visit = selectVisit(state, visitId)
  if (!visit) return <RecordNotFound kind="就医事件" backTo="/visits" />
  const preview = buildRolePreview(state, visit.id, state.previewRole)
  if (!preview) return <RecordNotFound kind="患者信息" backTo="/visits" />
  return <><PageHeader title="角色可见范围预览" subtitle="这是单机前端模拟，不会生成公开链接。" /><section className="card"><label>预览身份<select value={state.previewRole} onChange={(event) => setPreviewRole(event.target.value as PreviewRole)}>{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></section><StatusPanel title={preview.title}><h2>{preview.identity}</h2><p>{preview.eventLine}</p><p className="muted">{preview.hiddenSummary}</p></StatusPanel><div className="card-grid">{preview.sections.map((section) => <section className="card" key={section.title}><h2>{section.title}</h2>{section.items.length ? <ul className="clean-list">{section.items.map((item, index) => <li key={`${section.title}-${index}`}>{item}</li>)}</ul> : <p className="muted">此角色当前没有可显示的内容。</p>}</section>)}</div><div className="button-row"><Link className="button secondary" to={`/visits/${visit.id}/summary`}>返回摘要</Link><Link className="button ghost" to={`/visits/${visit.id}`}>返回事件</Link></div></>
}

export function NotFoundPage() {
  const { state } = useAppStore()
  return <EmptyState title="页面不存在" description="地址可能已失效，请返回首页或最近一次事件。" actionLabel={state.meta.lastOpenedVisitId ? '返回最近事件' : '返回首页'} actionTo={state.meta.lastOpenedVisitId ? `/visits/${state.meta.lastOpenedVisitId}` : '/'} />
}
