import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeader } from '../components/common/PageHeader'
import { RecordNotFound } from '../components/common/RecordNotFound'
import { StatusPanel } from '../components/common/StatusPanel'
import { useUnsavedChanges } from '../components/common/useUnsavedChanges'
import { VisitStepper } from '../components/visit/VisitStepper'
import { buildVisitChecklist } from '../domain/visitChecklist'
import { useAppStore } from '../store/AppStoreContext'
import { selectPatient, selectVisit } from '../store/selectors'
import type { VisitFormDraft, VisitStatus } from '../types'

const visitTypeLabel = { outpatient: '门诊', follow_up: '复诊', inpatient: '住院' } as const
const visitStatusLabel: Record<VisitStatus, string> = {
  draft: '草稿', preparing: '诊前准备中', in_progress: '进行中', follow_up: '诊后执行中', completed: '已完成', archived: '已归档',
}

export function VisitsPage() {
  const { state } = useAppStore()
  const groups = [
    { title: '进行中', visits: state.visits.filter((visit) => ['in_progress', 'follow_up'].includes(visit.status)) },
    { title: '即将到来', visits: state.visits.filter((visit) => ['draft', 'preparing'].includes(visit.status)) },
    { title: '已完成', visits: state.visits.filter((visit) => visit.status === 'completed') },
  ]
  return (
    <>
      <PageHeader title="就医事件" subtitle="一次事件承载本次准备、用户记录和行动任务。" action={<Link className="button primary" to="/visits/new">创建事件</Link>} />
      {!state.visits.length ? <EmptyState title="还没有就医事件" description="选择一位家庭成员，为本次门诊、复诊或住院建立独立事件。" actionLabel="创建事件" actionTo="/visits/new" /> : groups.map((group) => group.visits.length > 0 && (
        <section key={group.title}><h2 className="group-title">{group.title}</h2><div className="card-grid">{group.visits.map((visit) => {
          const patient = selectPatient(state, visit.patientId)
          return <Link className="card linked-card" to={`/visits/${visit.id}`} key={visit.id}><span className="eyebrow">{visitTypeLabel[visit.visitType]} · {visitStatusLabel[visit.status]}</span><h2>{patient?.displayName ?? '未知患者'}</h2><p>{visit.purpose}</p><small>{new Date(visit.date).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}</small></Link>
        })}</div></section>
      ))}
    </>
  )
}

const emptyVisitDraft = (patientId = '', sourceVisit?: ReturnType<typeof selectVisit>): VisitFormDraft => ({
  patientId,
  followUpFromVisitId: sourceVisit?.id,
  visitType: sourceVisit ? 'follow_up' : 'outpatient',
  date: '',
  purpose: sourceVisit ? `复诊：${sourceVisit.purpose}` : '',
  hospital: sourceVisit?.hospital ?? '',
  department: sourceVisit?.department ?? '',
  companion: sourceVisit?.companion ?? '',
})

export function VisitFormPage() {
  const { state, saveVisit, setVisitDraft } = useAppStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryPatientId = searchParams.get('patientId') ?? ''
  const followUpFromId = searchParams.get('followUpFrom') ?? undefined
  const sourceVisit = selectVisit(state, followUpFromId)
  const initial = useMemo(() => {
    const matchingDraft = state.drafts.visitForm?.followUpFromVisitId === followUpFromId ? state.drafts.visitForm : undefined
    return matchingDraft ?? emptyVisitDraft(sourceVisit?.patientId ?? queryPatientId, sourceVisit)
  }, [followUpFromId, queryPatientId, sourceVisit, state.drafts.visitForm])
  const [form, setForm] = useState(initial)
  const formRef = useRef(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setDirty] = useState(Boolean(state.drafts.visitForm))
  const [saveError, setSaveError] = useState<string>()
  useUnsavedChanges(isDirty)

  const update = (field: keyof VisitFormDraft, value: string) => {
    const next = { ...formRef.current, [field]: value }
    formRef.current = next
    setForm(next)
    setDirty(true)
    setVisitDraft(next)
  }
  const cancel = () => {
    if (!isDirty || window.confirm('有未保存修改，确定不保存并离开吗？')) {
      setVisitDraft(undefined)
      navigate('/visits')
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.patientId) nextErrors.patientId = '请选择一位患者。'
    if (!form.visitType) nextErrors.visitType = '请选择就医类型。'
    if (!form.date) nextErrors.date = '请选择就医日期和时间。'
    if (!form.purpose.trim()) nextErrors.purpose = '请说明本次就医目的。'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length || !form.patientId || !form.visitType || !form.date) return
    try {
      const id = saveVisit({
        patientId: form.patientId,
        visitType: form.visitType,
        date: new Date(form.date).toISOString(),
        purpose: form.purpose.trim(),
        hospital: form.hospital?.trim() || undefined,
        department: form.department?.trim() || undefined,
        companion: form.companion?.trim() || undefined,
      }, form.followUpFromVisitId)
      setDirty(false)
      navigate(`/visits/${id}`)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '保存失败，请重试。')
    }
  }

  return (
    <>
      <PageHeader title="创建就医事件" subtitle="患者、类型、日期和目的为必填；医院与科室可稍后补充。" />
      {!state.patients.length ? <EmptyState title="请先创建患者" description="每个就医事件必须关联一位家庭成员。" actionLabel="创建患者" actionTo="/patients/new" /> : <>
        {sourceVisit && <StatusPanel title="复诊继承规则"><p>将复制上次事件的医疗资料和仍未完成的任务；不会复制症状、问题、医生说明或已完成任务。复制后可在新事件中单独修改。</p></StatusPanel>}
        {state.drafts.visitForm && <StatusPanel title="已恢复本地草稿"><p>检测到上次未完成的事件信息，可继续填写。</p></StatusPanel>}
        {saveError && <StatusPanel title="保存失败" tone="error"><p>{saveError}</p></StatusPanel>}
        <form className="card form-grid" onSubmit={submit}>
          <Field label="患者（必填）" error={errors.patientId}><select value={form.patientId ?? ''} onChange={(event) => update('patientId', event.target.value)}><option value="">请选择</option>{state.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.displayName}</option>)}</select></Field>
          <Field label="就医类型（必填）" error={errors.visitType}><select value={form.visitType ?? ''} onChange={(event) => update('visitType', event.target.value)}><option value="outpatient">门诊</option><option value="follow_up">复诊</option><option value="inpatient">住院</option></select></Field>
          <Field label="日期时间（必填）" error={errors.date}><input type="datetime-local" value={form.date ?? ''} onChange={(event) => update('date', event.target.value)} /></Field>
          <Field label="目的（必填）" error={errors.purpose}><input value={form.purpose} onChange={(event) => update('purpose', event.target.value)} /></Field>
          <label>医院<input value={form.hospital ?? ''} onChange={(event) => update('hospital', event.target.value)} /></label>
          <label>科室<input value={form.department ?? ''} onChange={(event) => update('department', event.target.value)} /></label>
          <label className="full">陪同人（可选）<input value={form.companion ?? ''} onChange={(event) => update('companion', event.target.value)} /></label>
          <div className="form-actions full"><button className="button ghost" type="button" onClick={cancel}>取消</button><button className="button primary" type="submit">创建事件</button></div>
        </form>
      </>}
    </>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label>{label}{children}{error && <span className="field-error">{error}</span>}</label>
}

export function VisitOverviewPage() {
  const { visitId } = useParams()
  const { state, setVisitStatus } = useAppStore()
  const visit = selectVisit(state, visitId)
  if (!visit) return <RecordNotFound kind="就医事件" backTo="/visits" />
  const patient = selectPatient(state, visit.patientId)
  const pendingCount = state.tasks.filter((item) => item.visitId === visit.id && item.status === 'pending').length
  const checklist = buildVisitChecklist(state, visit)
  const nextItem = checklist.find((item) => !item.complete)
  const completedCount = checklist.filter((item) => item.complete).length
  const transition = () => {
    const next: Partial<Record<VisitStatus, VisitStatus>> = {
      draft: 'preparing', preparing: 'in_progress', in_progress: 'follow_up', follow_up: 'completed', completed: 'archived', archived: 'completed',
    }
    const target = next[visit.status]
    if (!target) return
    if (target === 'completed' && pendingCount > 0 && !window.confirm(`还有 ${pendingCount} 项任务未完成，仍要结束本次事件吗？`)) return
    const transitionMessage: Partial<Record<VisitStatus, string>> = {
      in_progress: '确认开始本次就医吗？状态将从“诊前准备中”变为“进行中”。',
      follow_up: '确认进入诊后执行吗？诊前记录仍会保留。',
      archived: '确认归档这个事件吗？归档后仍可从历史记录恢复。',
    }
    if (transitionMessage[target] && !window.confirm(transitionMessage[target])) return
    setVisitStatus(visit.id, target)
  }
  const actionLabel: Record<VisitStatus, string> = {
    draft: '开始准备', preparing: '开始本次就医', in_progress: '进入诊后执行', follow_up: '结束本次事件', completed: '归档隐藏', archived: '恢复事件',
  }
  return <>
    <PageHeader title={visit.purpose} subtitle={`${patient?.displayName ?? '未知患者'} · ${visitTypeLabel[visit.visitType]} · ${new Date(visit.date).toLocaleDateString('zh-CN')}`} action={<button className="button secondary" type="button" onClick={transition}>{actionLabel[visit.status]}</button>} />
    <VisitStepper visitId={visit.id} />
    <section className="overview-banner">
      <div><span className="event-meta"><span className="status-dot" />{visitStatusLabel[visit.status]}</span><h2>{nextItem ? nextItem.label : '本次事件信息已整理'}</h2><p>{nextItem?.hint ?? '可以查看、打印摘要，或为下一次复诊创建事件。'}</p><div className="button-row">{nextItem ? <Link className="button primary" to={nextItem.to}>继续下一步 →</Link> : <Link className="button primary" to={`/visits/${visit.id}/summary`}>查看一页摘要 →</Link>}<Link className="button light" to={`/share-preview/${visit.id}`}>角色预览</Link></div></div>
      <div className="completion-ring light" aria-label={`已完成 ${completedCount} / ${checklist.length} 项`}><strong>{completedCount}/{checklist.length}</strong><span>整理完成</span></div>
    </section>
    <div className="overview-grid">
      <section className="card checklist-card"><div className="section-heading"><div><span className="eyebrow">流程</span><h2>本次事件清单</h2></div><span className="muted">{visit.progress}%</span></div><div className="journey-list">{checklist.map((item, index) => <Link className={`journey-row ${item.complete ? 'complete' : ''} ${item.id === nextItem?.id ? 'active' : ''}`} to={item.to} key={item.id}><span className="journey-index">{item.complete ? '✓' : index + 1}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span><span className="journey-status">{item.complete ? '已完成' : item.id === nextItem?.id ? '下一步' : '待开始'}</span></Link>)}</div></section>
      <aside>
        <section className="card compact-card"><span className="eyebrow">事件信息</span><dl className="summary-facts"><div><dt>医院</dt><dd>{visit.hospital ?? '待补充'}</dd></div><div><dt>科室</dt><dd>{visit.department ?? '待补充'}</dd></div><div><dt>陪同</dt><dd>{visit.companion ?? '未填写'}</dd></div><div><dt>待办</dt><dd>{pendingCount} 项</dd></div></dl></section>
        <section className="card compact-card"><span className="eyebrow">后续操作</span><div className="button-stack"><Link className="button secondary" to={`/visits/new?patientId=${visit.patientId}&followUpFrom=${visit.id}`}>从本次创建复诊</Link><Link className="button ghost" to={`/visits/${visit.id}/summary`}>查看与打印摘要</Link></div>{pendingCount > 0 && ['follow_up', 'completed'].includes(visit.status) && <p className="field-hint">仍有 {pendingCount} 项任务未完成。</p>}</section>
      </aside>
    </div>
    {visit.visitType === 'inpatient' && <section className="card"><div className="section-heading"><div><span className="eyebrow">住院分支</span><h2>住院事务</h2></div></div><div className="feature-links"><Link to={`/visits/${visit.id}/inpatient/tasks`}><strong>任务板</strong><span>检查、缴费与陪护事务 →</span></Link><Link to={`/visits/${visit.id}/inpatient/handoff`}><strong>陪护交接</strong><span>变化、待办与下一班注意 →</span></Link><Link to={`/visits/${visit.id}/inpatient/discharge`}><strong>出院清单</strong><span>材料、票据与后续行动 →</span></Link></div></section>}
  </>
}
