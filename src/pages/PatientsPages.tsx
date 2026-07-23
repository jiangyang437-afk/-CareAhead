import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeader } from '../components/common/PageHeader'
import { RecordNotFound } from '../components/common/RecordNotFound'
import { StatusPanel } from '../components/common/StatusPanel'
import { useUnsavedChanges } from '../components/common/useUnsavedChanges'
import { useAppStore } from '../store/AppStoreContext'
import { selectPatient, selectPatientVisits } from '../store/selectors'
import type { PatientFormDraft } from '../types'

export function PatientsPage() {
  const { state } = useAppStore()
  return (
    <>
      <PageHeader title="家庭成员" subtitle="保存可跨次复用的患者基础信息。" action={<Link className="button primary" to="/patients/new">新建患者</Link>} />
      {!state.patients.length ? <EmptyState title="还没有家庭成员" description="建立患者后，才能创建并关联一次就医事件。" actionLabel="新建患者" actionTo="/patients/new" /> : (
        <div className="card-grid">{state.patients.map((patient) => (
          <Link className="card linked-card" to={`/patients/${patient.id}`} key={patient.id}>
            <span className="eyebrow">{patient.relation}</span><h2>{patient.displayName}</h2><p>{patient.ageRange ?? '年龄段未填写'}</p>
          </Link>
        ))}</div>
      )}
    </>
  )
}

export function PatientDetailPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { state, deletePatient } = useAppStore()
  const patient = selectPatient(state, patientId)
  if (!patient) return <RecordNotFound kind="患者" backTo="/patients" />
  const visits = selectPatientVisits(state, patient.id)
  const latestVisit = [...visits].sort((a, b) => b.date.localeCompare(a.date))[0]
  const remove = () => {
    if (visits.length > 0) {
      window.alert(`该患者关联 ${visits.length} 个就医事件。为避免丢失关联数据，当前不能直接删除。`)
      return
    }
    if (window.confirm(`确定删除“${patient.displayName}”吗？此操作不可撤销。`) && deletePatient(patient.id)) navigate('/patients')
  }
  return (
    <>
      <PageHeader title={patient.displayName} subtitle={`${patient.relation} · ${patient.ageRange ?? '年龄段未填写'}`} action={<Link className="button secondary" to={`/patients/${patient.id}/edit`}>编辑</Link>} />
      <div className="two-column">
        <section className="card"><h2>关键信息</h2><InfoList label="过敏" values={patient.allergies} /><InfoList label="当前用药" values={patient.medications.map((item) => item.name)} /><InfoList label="关键病史" values={patient.keyHistory} /></section>
        <section className="card"><h2>相关操作</h2><div className="button-stack"><Link className="button primary" to={`/visits/new?patientId=${patient.id}`}>创建新事件</Link>{latestVisit ? <Link className="button secondary" to={`/visits/new?patientId=${patient.id}&followUpFrom=${latestVisit.id}`}>从最近事件创建复诊</Link> : <button className="button secondary" disabled>暂无可继承事件</button>}<button className="button danger" type="button" onClick={remove}>删除患者</button></div></section>
      </div>
      <section className="card"><div className="section-heading"><h2>历史事件</h2><Link to="/history">查看全部历史</Link></div>{visits.length ? <ul className="clean-list">{visits.map((visit) => <li key={visit.id}><Link to={`/visits/${visit.id}`}>{visit.purpose}</Link><span>{new Date(visit.date).toLocaleDateString('zh-CN')}</span></li>)}</ul> : <p className="muted">尚无关联事件。</p>}</section>
    </>
  )
}

function InfoList({ label, values }: { label: string; values: string[] }) {
  return <div className="info-group"><h3>{label}</h3>{values.length ? <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p className="muted">未填写</p>}</div>
}

const emptyDraft = (patientId?: string): PatientFormDraft => ({
  patientId,
  displayName: '', relation: '', ageRange: '', allergies: '', medications: '', keyHistory: '',
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
})

export function PatientFormPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { state, savePatient, setPatientDraft } = useAppStore()
  const editing = Boolean(patientId)
  const patient = selectPatient(state, patientId)
  const matchingDraft = state.drafts.patientForm?.patientId === patientId ? state.drafts.patientForm : undefined
  const initial = useMemo<PatientFormDraft>(() => matchingDraft ?? (patient ? {
    patientId: patient.id,
    displayName: patient.displayName,
    relation: patient.relation,
    ageRange: patient.ageRange,
    allergies: patient.allergies.join('\n'),
    medications: patient.medications.map((item) => item.name).join('\n'),
    keyHistory: patient.keyHistory.join('\n'),
    emergencyContactName: patient.emergencyContact?.name ?? '',
    emergencyContactPhone: patient.emergencyContact?.phone ?? '',
    emergencyContactRelation: patient.emergencyContact?.relation ?? '',
  } : emptyDraft(patientId)), [matchingDraft, patient, patientId])
  const [form, setForm] = useState(initial)
  const formRef = useRef(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setDirty] = useState(Boolean(matchingDraft))
  const [saveError, setSaveError] = useState<string>()
  useUnsavedChanges(isDirty)
  if (editing && !patient) return <RecordNotFound kind="患者" backTo="/patients" />

  const update = (field: keyof PatientFormDraft, value: string) => {
    const next = { ...formRef.current, [field]: value }
    formRef.current = next
    setForm(next)
    setDirty(true)
    setPatientDraft(next)
  }
  const cancel = () => {
    if (!isDirty || window.confirm('有未保存修改，确定不保存并离开吗？')) {
      setPatientDraft(undefined)
      navigate(patient ? `/patients/${patient.id}` : '/patients')
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.displayName.trim()) nextErrors.displayName = '请填写患者称呼。'
    if (!form.relation.trim()) nextErrors.relation = '请填写与患者的关系。'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    try {
      const id = savePatient({
        displayName: form.displayName.trim(),
        relation: form.relation.trim(),
        ageRange: form.ageRange || undefined,
        allergies: splitLines(form.allergies),
        medications: splitLines(form.medications).map((name) => ({ name })),
        keyHistory: splitLines(form.keyHistory),
        emergencyContact: form.emergencyContactName.trim() ? {
          name: form.emergencyContactName.trim(),
          phone: form.emergencyContactPhone.trim() || undefined,
          relation: form.emergencyContactRelation.trim() || undefined,
        } : undefined,
      }, patientId)
      setDirty(false)
      navigate(`/patients/${id}`)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '保存失败，请重试。')
    }
  }

  return (
    <>
      <PageHeader title={editing ? '编辑患者' : '创建患者'} subtitle="只有称呼和关系是必填项；医疗字段允许跳过。" />
      {matchingDraft && <StatusPanel title="已恢复本地草稿"><p>检测到上次未完成的输入，可继续编辑或取消后清除。</p></StatusPanel>}
      {saveError && <StatusPanel title="保存失败" tone="error"><p>{saveError}</p></StatusPanel>}
      <form className="card form-grid" onSubmit={submit}>
        <Field label="称呼（必填）" error={errors.displayName}><input value={form.displayName} onChange={(event) => update('displayName', event.target.value)} /></Field>
        <Field label="关系（必填）" error={errors.relation}><input value={form.relation} onChange={(event) => update('relation', event.target.value)} /></Field>
        <label>年龄段<select value={form.ageRange ?? ''} onChange={(event) => update('ageRange', event.target.value)}><option value="">暂不填写</option><option>0–17 岁</option><option>18–39 岁</option><option>40–59 岁</option><option>60–69 岁</option><option>70 岁以上</option></select></label>
        <label className="full">过敏（每行一项）<textarea value={form.allergies} onChange={(event) => update('allergies', event.target.value)} /></label>
        <label className="full">当前用药（每行一项）<textarea value={form.medications} onChange={(event) => update('medications', event.target.value)} /></label>
        <label className="full">关键病史（每行一项）<textarea value={form.keyHistory} onChange={(event) => update('keyHistory', event.target.value)} /></label>
        <label>紧急联系人（可选）<input value={form.emergencyContactName} onChange={(event) => update('emergencyContactName', event.target.value)} /></label>
        <label>联系电话（可选）<input type="tel" value={form.emergencyContactPhone} onChange={(event) => update('emergencyContactPhone', event.target.value)} /></label>
        <label>联系人关系（可选）<input value={form.emergencyContactRelation} onChange={(event) => update('emergencyContactRelation', event.target.value)} /></label>
        <div className="form-actions full"><button className="button ghost" type="button" onClick={cancel}>取消</button><button className="button primary" type="submit">保存患者</button></div>
      </form>
    </>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label>{label}{children}{error && <span className="field-error">{error}</span>}</label>
}

const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean)
