import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { RecordNotFound } from '../components/common/RecordNotFound'
import { StatusPanel } from '../components/common/StatusPanel'
import { useUnsavedChanges } from '../components/common/useUnsavedChanges'
import { VisitWorkspace } from '../components/visit/VisitWorkspace'
import { useAppStore } from '../store/AppStoreContext'
import { selectPatient, selectVisit } from '../store/selectors'
import type { HandoffEntry, NoteCategory, PrepMaterial, TaskStatus, TaskType, VisitEvent, VisitPreparation } from '../types'

const defaultPreparation = (): VisitPreparation => ({
  patientInfoConfirmed: false, materialsConfirmed: false, materials: [], questions: [],
  noNewSymptoms: false, noDocuments: false, noQuestions: false, noDoctorNotes: false, noTasks: false,
})

const defaultMaterials: PrepMaterial[] = ['身份证明', '医保凭证', '预约信息', '病历', '检查报告', '正在使用的药盒'].map((label, index) => ({ id: `standard-${index}`, label, checked: false, custom: false }))

function useVisitContext() {
  const { visitId } = useParams()
  const store = useAppStore()
  const visit = selectVisit(store.state, visitId)
  const patient = visit ? selectPatient(store.state, visit.patientId) : undefined
  return { ...store, visit, patient }
}

export function PrepPage() {
  const { state, visit, patient, saveSymptom, deleteSymptom, saveDocument, deleteDocument, updateVisitPreparation } = useVisitContext()
  const [symptomName, setSymptomName] = useState('')
  const [symptomDescription, setSymptomDescription] = useState('')
  const [symptomDate, setSymptomDate] = useState('')
  const [editingSymptomId, setEditingSymptomId] = useState<string>()
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentType, setDocumentType] = useState('检查资料')
  const [editingDocumentId, setEditingDocumentId] = useState<string>()
  const [question, setQuestion] = useState('')
  const [customMaterial, setCustomMaterial] = useState('')
  const [openPrepSection, setOpenPrepSection] = useState<'symptoms' | 'documents' | 'materials' | 'questions' | null>('symptoms')
  if (!visit) return <RecordNotFound kind="就医事件" backTo="/visits" />
  const symptoms = state.symptoms.filter((item) => item.visitId === visit.id)
  const documents = state.documents.filter((item) => item.visitId === visit.id)
  const prep = { ...defaultPreparation(), ...visit.preparation }
  const materials = prep.materials.length ? prep.materials : defaultMaterials
  const prepSections = {
    symptoms: symptoms.length > 0 || prep.noNewSymptoms,
    documents: documents.length > 0 || prep.noDocuments,
    materials: prep.materialsConfirmed,
    questions: prep.questions.length > 0 || prep.noQuestions,
  }
  const completedPrepSections = Object.values(prepSections).filter(Boolean).length

  const addSymptom = (event: FormEvent) => {
    event.preventDefault()
    if (!symptomName.trim()) return
    saveSymptom({ visitId: visit.id, name: symptomName.trim(), description: symptomDescription.trim() || undefined, startDate: symptomDate || undefined }, editingSymptomId)
    setSymptomName(''); setSymptomDescription(''); setSymptomDate('')
    setEditingSymptomId(undefined)
  }
  const addDocument = (event: FormEvent) => {
    event.preventDefault()
    if (!documentTitle.trim()) return
    saveDocument({ visitId: visit.id, type: documentType, title: documentTitle.trim() }, editingDocumentId)
    setDocumentTitle('')
    setEditingDocumentId(undefined)
  }
  const setMaterials = (next: PrepMaterial[]) => updateVisitPreparation(visit.id, { materials: next, materialsConfirmed: false })
  const addQuestion = (event: FormEvent) => {
    event.preventDefault()
    if (!question.trim()) return
    updateVisitPreparation(visit.id, { questions: [...prep.questions, question.trim()], noQuestions: false })
    setQuestion('')
  }
  const addMaterial = (event: FormEvent) => {
    event.preventDefault()
    if (!customMaterial.trim()) return
    setMaterials([...materials, { id: crypto.randomUUID(), label: customMaterial.trim(), checked: false, custom: true }])
    setCustomMaterial('')
  }
  const editSymptom = (id: string) => {
    const item = symptoms.find((current) => current.id === id)
    if (!item) return
    setEditingSymptomId(id); setSymptomName(item.name); setSymptomDate(item.startDate ?? ''); setSymptomDescription(item.description ?? '')
  }
  const editDocument = (id: string) => {
    const item = documents.find((current) => current.id === id)
    if (!item) return
    setEditingDocumentId(id); setDocumentTitle(item.title); setDocumentType(item.type)
  }

  return <VisitWorkspace visit={visit} patient={patient} title="诊前准备">
    <StatusPanel title={prep.patientInfoConfirmed ? '患者关键信息已确认' : '先确认患者关键信息'}><p>过敏、当前用药和关键病史沿用患者资料；确认表示已查看，不表示医疗信息完整。</p><button className="button secondary" onClick={() => updateVisitPreparation(visit.id, { patientInfoConfirmed: !prep.patientInfoConfirmed })}>{prep.patientInfoConfirmed ? '撤销确认' : '确认已查看'}</button></StatusPanel>
    <div className="prep-progress" aria-label={`诊前准备已完成 ${completedPrepSections} / 4 个小节`}><div><strong>诊前准备进度</strong><span>{completedPrepSections}/4 个小节已回应</span></div><progress max="4" value={completedPrepSections} /></div>
    <details className="card prep-step" open={openPrepSection === 'symptoms'} onToggle={(event) => setOpenPrepSection(event.currentTarget.open ? 'symptoms' : openPrepSection === 'symptoms' ? null : openPrepSection)}><summary><span><small>1 / 4</small><strong>症状时间线</strong></span><span className={prepSections.symptoms ? 'step-done' : 'step-pending'}>{prepSections.symptoms ? '已回应' : '待完成'}</span></summary><div className="prep-step-body"><label className="inline-check"><input type="checkbox" checked={prep.noNewSymptoms} onChange={(event) => updateVisitPreparation(visit.id, { noNewSymptoms: event.target.checked })} />本次无新症状</label>
      {symptoms.length ? <ul className="item-list">{symptoms.map((item) => <li key={item.id}><div><strong>{item.name}</strong><p>{item.startDate || '日期未填'} · {item.description || '无补充描述'}</p></div><div className="button-row"><button className="button ghost" type="button" onClick={() => editSymptom(item.id)}>编辑</button><button className="button ghost" type="button" onClick={() => window.confirm('删除这条症状记录吗？') && deleteSymptom(item.id)}>删除</button></div></li>)}</ul> : <p className="muted">暂无症状记录。</p>}
      <form className="compact-form" onSubmit={addSymptom}><label>症状名称<input value={symptomName} onChange={(event) => setSymptomName(event.target.value)} /></label><label>开始日期<input type="date" value={symptomDate} onChange={(event) => setSymptomDate(event.target.value)} /></label><label className="wide">用户描述<input value={symptomDescription} onChange={(event) => setSymptomDescription(event.target.value)} /></label>{editingSymptomId && <button className="button ghost" type="button" onClick={() => { setEditingSymptomId(undefined); setSymptomName(''); setSymptomDate(''); setSymptomDescription('') }}>取消</button>}<button className="button secondary" type="submit">{editingSymptomId ? '保存修改' : '添加症状'}</button></form>
    </div></details>
    <details className="card prep-step" open={openPrepSection === 'documents'} onToggle={(event) => setOpenPrepSection(event.currentTarget.open ? 'documents' : openPrepSection === 'documents' ? null : openPrepSection)}><summary><span><small>2 / 4</small><strong>就医资料</strong></span><span className={prepSections.documents ? 'step-done' : 'step-pending'}>{prepSections.documents ? '已回应' : '待完成'}</span></summary><div className="prep-step-body"><label className="inline-check"><input type="checkbox" checked={prep.noDocuments} onChange={(event) => updateVisitPreparation(visit.id, { noDocuments: event.target.checked })} />暂无资料</label>
      {documents.length ? <ul className="item-list">{documents.map((item) => <li key={item.id}><div><strong>{item.title}</strong><p>{item.type}</p></div><div className="button-row"><button className="button ghost" type="button" onClick={() => editDocument(item.id)}>编辑</button><button className="button ghost" type="button" onClick={() => window.confirm('删除这条资料索引吗？') && deleteDocument(item.id)}>删除</button></div></li>)}</ul> : <p className="muted">暂无资料索引；首版不保存真实大文件。</p>}
      <form className="compact-form" onSubmit={addDocument}><label>资料类型<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option>检查资料</option><option>病历</option><option>处方</option><option>其他</option></select></label><label className="wide">资料标题<input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} /></label>{editingDocumentId && <button className="button ghost" type="button" onClick={() => { setEditingDocumentId(undefined); setDocumentTitle(''); setDocumentType('检查资料') }}>取消</button>}<button className="button secondary" type="submit">{editingDocumentId ? '保存修改' : '添加资料'}</button></form>
    </div></details>
    <details className="card prep-step" open={openPrepSection === 'materials'} onToggle={(event) => setOpenPrepSection(event.currentTarget.open ? 'materials' : openPrepSection === 'materials' ? null : openPrepSection)}><summary><span><small>3 / 4</small><strong>材料清单</strong></span><span className={prepSections.materials ? 'step-done' : 'step-pending'}>{prepSections.materials ? '已确认' : '待完成'}</span></summary><div className="prep-step-body"><p className="muted">已勾选 {materials.filter((item) => item.checked).length}/{materials.length} 项；核对后请确认清单。</p>
      <div className="check-grid">{materials.map((item) => <label className="check-card" key={item.id}><input type="checkbox" checked={item.checked} onChange={(event) => setMaterials(materials.map((current) => current.id === item.id ? { ...current, checked: event.target.checked } : current))} />{item.label}{item.custom && <button type="button" className="icon-button" aria-label={`删除材料 ${item.label}`} onClick={() => setMaterials(materials.filter((current) => current.id !== item.id))}>×</button>}</label>)}</div>
      <form className="compact-form" onSubmit={addMaterial}><label className="wide">自定义材料<input value={customMaterial} onChange={(event) => setCustomMaterial(event.target.value)} /></label><button className="button secondary" type="submit">添加材料</button><button className="button primary" type="button" onClick={() => updateVisitPreparation(visit.id, { materials, materialsConfirmed: true })}>{prep.materialsConfirmed ? '已确认材料清单' : '确认材料清单'}</button></form>
    </div></details>
    <details className="card prep-step" open={openPrepSection === 'questions'} onToggle={(event) => setOpenPrepSection(event.currentTarget.open ? 'questions' : openPrepSection === 'questions' ? null : openPrepSection)}><summary><span><small>4 / 4</small><strong>待问问题</strong></span><span className={prepSections.questions ? 'step-done' : 'step-pending'}>{prepSections.questions ? '已回应' : '待完成'}</span></summary><div className="prep-step-body"><label className="inline-check"><input type="checkbox" checked={prep.noQuestions} onChange={(event) => updateVisitPreparation(visit.id, { noQuestions: event.target.checked })} />本次无问题</label>
      {prep.questions.length ? <ul className="item-list">{prep.questions.map((item, index) => <li key={`${item}-${index}`}><strong>{item}</strong><button className="button ghost" onClick={() => updateVisitPreparation(visit.id, { questions: prep.questions.filter((_, itemIndex) => itemIndex !== index) })}>删除</button></li>)}</ul> : <p className="muted">暂无待问问题。</p>}
      <form className="compact-form" onSubmit={addQuestion}><label className="wide">问题<input value={question} onChange={(event) => setQuestion(event.target.value)} /></label><button className="button secondary" type="submit">添加问题</button></form>
    </div></details>
  </VisitWorkspace>
}

const noteLabels: Record<NoteCategory, string> = { exam: '检查与结果状态', medication: '用药变化', precaution: '注意事项', follow_up: '复查安排', question: '待确认问题' }

export function DoctorNotesPage() {
  const { state, visit, patient, saveDoctorNote, deleteDoctorNote, convertNoteToTask, updateVisitPreparation } = useVisitContext()
  const [category, setCategory] = useState<NoteCategory>('exam')
  const [content, setContent] = useState('')
  const [convertingId, setConvertingId] = useState<string>()
  const [taskTitle, setTaskTitle] = useState('')
  const [taskType, setTaskType] = useState<TaskType>('exam')
  const [taskDate, setTaskDate] = useState('')
  if (!visit) return <RecordNotFound kind="就医事件" backTo="/visits" />
  const notes = state.doctorNotes.filter((item) => item.visitId === visit.id)
  const prep = { ...defaultPreparation(), ...visit.preparation }
  const addNote = (event: FormEvent) => { event.preventDefault(); if (!content.trim()) return; saveDoctorNote({ visitId: visit.id, category, content: content.trim(), date: new Date().toISOString() }); setContent('') }
  const startConvert = (id: string, noteContent: string, noteCategory: NoteCategory) => { setConvertingId(id); setTaskTitle(noteContent.slice(0, 30)); setTaskType(noteCategory === 'medication' ? 'medication' : noteCategory === 'follow_up' ? 'follow_up' : 'exam') }
  const convert = (event: FormEvent) => { event.preventDefault(); if (!convertingId || !taskTitle.trim()) return; convertNoteToTask(convertingId, { visitId: visit.id, patientId: visit.patientId, type: taskType, title: taskTitle.trim(), dueDate: taskDate || undefined, sourceType: 'doctor_note' }); setConvertingId(undefined); setTaskTitle(''); setTaskDate('') }
  return <VisitWorkspace visit={visit} patient={patient} title="医生说明">
    <StatusPanel title="请按医生说明记录" tone="warning"><p>这里只保存用户听到的原始要求，不解释检查结果，不自动生成医学建议。</p></StatusPanel>
    <form className="card compact-form" onSubmit={addNote}><label>记录分类<select value={category} onChange={(event) => setCategory(event.target.value as NoteCategory)}>{Object.entries(noteLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="wide">用户记录<input value={content} onChange={(event) => setContent(event.target.value)} /></label><button className="button primary" type="submit">保存说明</button></form>
    <label className="inline-check standalone"><input type="checkbox" checked={prep.noDoctorNotes} onChange={(event) => updateVisitPreparation(visit.id, { noDoctorNotes: event.target.checked })} />本次无新增说明</label>
    {notes.length ? <div className="card-grid">{notes.map((note) => <section className="card" key={note.id}><span className="eyebrow">用户记录 · {noteLabels[note.category]}</span><p>{note.content}</p><div className="button-row"><button className="button secondary" onClick={() => startConvert(note.id, note.content, note.category)}>转为任务</button><button className="button ghost" onClick={() => window.confirm(note.convertedTaskIds.length ? '删除说明后，已生成任务会保留但解除来源关联。继续吗？' : '删除这条说明吗？') && deleteDoctorNote(note.id)}>删除</button></div>{convertingId === note.id && <form className="nested-form" onSubmit={convert}><label>任务标题<input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} /></label><label>任务类型<select value={taskType} onChange={(event) => setTaskType(event.target.value as TaskType)}><TaskTypeOptions /></select></label><label>日期（可选）<input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} /></label><button className="button primary" type="submit">确认生成</button></form>}</section>)}</div> : <EmptyState title="还没有医生说明" description="就诊时可按检查、用药变化、注意事项、复查安排和待确认问题分类记录。" />}
  </VisitWorkspace>
}

export function TasksPage() {
  const { state, visit, patient, saveTask, toggleTask, deleteTask, updateVisitPreparation } = useVisitContext()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TaskType>('errand')
  const [dueDate, setDueDate] = useState('')
  const [assignee, setAssignee] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string>()
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  if (!visit) return <RecordNotFound kind="就医事件" backTo="/visits" />
  const prep = { ...defaultPreparation(), ...visit.preparation }
  const allTasks = state.tasks.filter((item) => item.visitId === visit.id)
  const tasks = (filter === 'all' ? allTasks : allTasks.filter((item) => item.status === filter)).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  const todayDate = new Date().toISOString().slice(0, 10)
  const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  const groups = [
    { key: 'overdue', label: '已逾期', tasks: tasks.filter((item) => item.status === 'pending' && item.dueDate && item.dueDate < todayDate) },
    { key: 'today', label: '今天', tasks: tasks.filter((item) => item.status === 'pending' && item.dueDate === todayDate) },
    { key: 'soon', label: '未来七天', tasks: tasks.filter((item) => item.status === 'pending' && item.dueDate && item.dueDate > todayDate && item.dueDate <= nextWeek) },
    { key: 'later', label: '稍后', tasks: tasks.filter((item) => item.status === 'pending' && item.dueDate && item.dueDate > nextWeek) },
    { key: 'undated', label: '日期待定', tasks: tasks.filter((item) => item.status === 'pending' && !item.dueDate) },
    { key: 'completed', label: '已完成', tasks: tasks.filter((item) => item.status === 'completed') },
  ].filter((group) => group.tasks.length)
  const resetTaskForm = () => { setEditingTaskId(undefined); setTitle(''); setType('errand'); setDueDate(''); setAssignee('') }
  const addTask = (event: FormEvent) => { event.preventDefault(); if (!title.trim()) return; saveTask({ visitId: visit.id, patientId: visit.patientId, type, title: title.trim(), dueDate: dueDate || undefined, assigneeRole: assignee.trim() || undefined, sourceType: editingTaskId ? allTasks.find((item) => item.id === editingTaskId)?.sourceType ?? 'manual' : 'manual' }, editingTaskId); resetTaskForm() }
  const editTask = (taskId: string) => {
    const task = allTasks.find((item) => item.id === taskId)
    if (!task) return
    setEditingTaskId(task.id); setTitle(task.title); setType(task.type); setDueDate(task.dueDate ?? ''); setAssignee(task.assigneeRole ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return <VisitWorkspace visit={visit} patient={patient} title="行动清单">
    <form className="card compact-form task-composer" onSubmit={addTask}><label className="wide">{editingTaskId ? '编辑行动' : '新增行动'}<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：领取检查资料" /></label><label>类型<select value={type} onChange={(event) => setType(event.target.value as TaskType)}><TaskTypeOptions /></select></label><label>日期<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label>负责人<input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="可选" /></label>{editingTaskId && <button className="button ghost" type="button" onClick={resetTaskForm}>取消</button>}<button className="button primary" type="submit">{editingTaskId ? '保存修改' : '＋ 添加'}</button></form>
    <div className="filter-row"><div className="segmented">{(['pending', 'all', 'completed'] as const).map((value) => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'pending' ? `待完成 ${allTasks.filter((item) => item.status === 'pending').length}` : value === 'completed' ? '已完成' : '全部'}</button>)}</div><label className="inline-check"><input type="checkbox" checked={prep.noTasks} onChange={(event) => updateVisitPreparation(visit.id, { noTasks: event.target.checked })} />本次无后续任务</label></div>
    {groups.length ? <div className="task-groups">{groups.map((group) => <section key={group.key}><h2 className={group.key === 'overdue' ? 'overdue-heading' : ''}>{group.label}<span>{group.tasks.length}</span></h2><ul className="task-list">{group.tasks.map((task) => <li className={task.status} key={task.id}><button className="task-check" type="button" aria-label={task.status === 'pending' ? `完成 ${task.title}` : `恢复 ${task.title}`} onClick={() => toggleTask(task.id)}>{task.status === 'completed' ? '✓' : ''}</button><div><strong>{task.title}</strong><p>{task.dueDate ?? '日期待定'} · {task.assigneeRole ?? '负责人待定'} · {taskTypeLabel(task.type)}</p></div><span className="source-chip">{sourceLabel(task.sourceType)}</span><div className="task-row-actions"><button className="button ghost" type="button" onClick={() => editTask(task.id)}>编辑</button><button className="icon-button" type="button" aria-label={`删除 ${task.title}`} onClick={() => window.confirm('删除这项任务吗？') && deleteTask(task.id)}>×</button></div></li>)}</ul></section>)}</div> : <EmptyState title={allTasks.length ? '当前筛选无任务' : '暂无行动任务'} description="医生说明可由用户确认后转为任务，也可以在此手动新增。" />}
  </VisitWorkspace>
}

const taskTypeLabel = (type: TaskType) => ({ medication: '用药', exam: '检查', follow_up: '复查', document: '资料', errand: '事务' }[type])
const sourceLabel = (source: string) => ({ manual: '手动', doctor_note: '医生说明', discharge: '出院清单', inherited: '上次继承' }[source] ?? source)

function TaskTypeOptions() { return <><option value="medication">用药</option><option value="exam">检查</option><option value="follow_up">复查</option><option value="document">资料</option><option value="errand">事务</option></> }

export function SummaryPage() {
  const { state, visit, patient } = useVisitContext()
  if (!visit) return <RecordNotFound kind="就医事件" backTo="/visits" />
  if (!patient) return <RecordNotFound kind="患者" backTo="/patients" />
  const symptoms = state.symptoms.filter((item) => item.visitId === visit.id)
  const documents = state.documents.filter((item) => item.visitId === visit.id)
  const notes = state.doctorNotes.filter((item) => item.visitId === visit.id)
  const tasks = state.tasks.filter((item) => item.visitId === visit.id && item.status === 'pending')
  const prep = { ...defaultPreparation(), ...visit.preparation }
  return <VisitWorkspace visit={visit} patient={patient} title="一页摘要" action={<button className="button primary" type="button" onClick={() => window.print()}>打印 / 另存 PDF</button>}><StatusPanel title="本地摘要"><p>摘要按当前本地数据实时聚合；可在事件概览进入角色与脱敏预览。</p></StatusPanel><article className="card summary-sheet"><h2>{patient?.displayName ?? '未知患者'} · {visit.purpose}</h2><p>{new Date(visit.date).toLocaleDateString('zh-CN')} · {visit.hospital ?? '医院未填写'} · {visit.department ?? '科室未填写'}</p>{(symptoms.length || patient?.allergies.length || patient?.medications.length) > 0 && <section><h3>症状与关键信息</h3>{symptoms.map((item) => <p key={item.id}>{item.name}：{item.description || '无补充描述'}</p>)}{patient?.allergies.length ? <p>过敏：{patient.allergies.join('、')}</p> : null}{patient?.medications.length ? <p>当前用药：{patient.medications.map((item) => item.name).join('、')}</p> : null}</section>}{(documents.length || prep.questions.length) > 0 && <section><h3>本次资料与问题</h3>{documents.length ? <p>资料：{documents.map((item) => item.title).join('、')}</p> : null}{prep.questions.length ? <ul>{prep.questions.map((item) => <li key={item}>{item}</li>)}</ul> : null}</section>}{notes.length > 0 && <section><h3>医生说明（用户记录）</h3>{notes.map((item) => <p key={item.id}><strong>{noteLabels[item.category]}：</strong>{item.content}</p>)}</section>}{tasks.length > 0 && <section><h3>未完成行动</h3><ul>{tasks.map((task) => <li key={task.id}>□ {task.title}{task.dueDate ? `（${task.dueDate}）` : ''}</li>)}</ul></section>}<p className="record-label">医生说明均为用户记录，不构成医疗建议。</p></article></VisitWorkspace>
}

function InpatientGate({ visit, children }: { visit: VisitEvent; children: React.ReactNode }) {
  return visit.visitType === 'inpatient' ? children : <StatusPanel title="仅住院事件可用" tone="warning"><p>当前事件不是住院类型，住院任务板、陪护交接和出院清单不会展示。</p><Link to={`/visits/${visit.id}`}>返回事件概览</Link></StatusPanel>
}

const today = () => new Date().toISOString().slice(0, 10)
const localDateTime = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)

export function InpatientTasksPage() {
  const { state, visit, patient, saveInpatientTask, assignInpatientTask, toggleInpatientTask, deleteInpatientTask } = useVisitContext()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today())
  const [deadline, setDeadline] = useState('')
  const [assignee, setAssignee] = useState('')
  const [note, setNote] = useState('')
  const [filter, setFilter] = useState<'all' | TaskStatus>('all')
  useUnsavedChanges(Boolean(title || deadline || assignee || note))
  if (!visit) return <RecordNotFound kind="就医事件" backTo="/visits" />
  const tasks = state.inpatient.tasks
    .filter((item) => item.visitId === visit.id && (filter === 'all' || item.status === filter))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.deadline ?? '').localeCompare(b.deadline ?? ''))
  const grouped = tasks.reduce<Record<string, typeof tasks>>((result, item) => {
    ;(result[item.date] ??= []).push(item)
    return result
  }, {})
  const groups = Object.entries(grouped)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !date) return
    saveInpatientTask({ visitId: visit.id, date, title: title.trim(), assigneeRole: assignee.trim() || undefined, deadline: deadline ? new Date(deadline).toISOString() : undefined, note: note.trim() || undefined })
    setTitle(''); setDeadline(''); setAssignee(''); setNote('')
  }
  const claim = (id: string, current?: string) => {
    const value = window.prompt('输入本机模拟的负责人角色或姓名', current ?? '')
    if (value !== null) assignInpatientTask(id, value)
  }
  return <VisitWorkspace visit={visit} patient={patient} title="住院任务板"><InpatientGate visit={visit}><StatusPanel title="单机负责人模拟"><p>负责人只保存在当前浏览器，不发送认领通知，也不代表真实多人协作。</p></StatusPanel><form className="card compact-form" onSubmit={submit}><label className="wide">任务<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="检查、缴费、取报告、采购或陪护事务" required /></label><label>日期<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label>截止时间<input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label><label>负责人<input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="可选" /></label><label className="wide">备注<input value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="button primary" type="submit">新增任务</button></form><div className="filter-row"><strong>{tasks.length} 项任务</strong><div className="segmented">{([['all', '全部'], ['pending', '待完成'], ['completed', '已完成']] as const).map(([value, label]) => <button className={filter === value ? 'active' : ''} type="button" onClick={() => setFilter(value)} key={value}>{label}</button>)}</div></div>{groups.length ? groups.map(([groupDate, items]) => <section key={groupDate}><h2 className="group-title">{groupDate}</h2><div className="card-grid">{items?.map((item) => <article className={`card task-card ${item.status}`} key={item.id}><span className="eyebrow">{item.status === 'completed' ? '已完成' : '待完成'}</span><h2>{item.title}</h2><p>{item.deadline ? `截止 ${new Date(item.deadline).toLocaleString('zh-CN')}` : '未设置截止时间'}</p><p className="muted">负责人：{item.assigneeRole ?? '未认领'}{item.note ? ` · ${item.note}` : ''}</p><div className="button-row"><button className="button secondary" type="button" onClick={() => toggleInpatientTask(item.id)}>{item.status === 'completed' ? '恢复待办' : '标记完成'}</button><button className="button ghost" type="button" onClick={() => claim(item.id, item.assigneeRole)}>认领/改派</button><button className="button danger" type="button" onClick={() => window.confirm('确定删除这项住院任务吗？') && deleteInpatientTask(item.id)}>删除</button></div></article>)}</div></section>) : <EmptyState title="当前筛选下没有住院任务" description="可新增检查、缴费、取报告、采购和陪护事务。" />}</InpatientGate></VisitWorkspace>
}

const emptyHandoff = () => ({ dateTime: localDateTime(), changes: '', completed: '', pending: '', nextDay: '', note: '' })

export function HandoffPage() {
  const { state, visit, patient, saveHandoff } = useVisitContext()
  const [form, setForm] = useState(emptyHandoff)
  const [editingId, setEditingId] = useState<string>()
  useUnsavedChanges(Boolean(editingId || form.changes || form.completed || form.pending || form.nextDay || form.note))
  if (!visit) return <RecordNotFound kind="就医事件" backTo="/visits" />
  const handoffs = state.inpatient.handoffs.filter((item) => item.visitId === visit.id).sort((a, b) => b.dateTime.localeCompare(a.dateTime))
  const update = (field: keyof ReturnType<typeof emptyHandoff>, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.dateTime || !form.changes.trim()) return
    saveHandoff({ visitId: visit.id, dateTime: new Date(form.dateTime).toISOString(), changes: form.changes.trim(), completed: form.completed.trim(), pending: form.pending.trim(), nextDay: form.nextDay.trim(), note: form.note.trim() || undefined }, editingId)
    setForm(emptyHandoff()); setEditingId(undefined)
  }
  const edit = (item: HandoffEntry) => {
    const dateTime = new Date(new Date(item.dateTime).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    setForm({ dateTime, changes: item.changes, completed: item.completed, pending: item.pending, nextDay: item.nextDay, note: item.note ?? '' }); setEditingId(item.id)
  }
  return <VisitWorkspace visit={visit} patient={patient} title="陪护交接"><InpatientGate visit={visit}><StatusPanel title="记录边界" tone="warning"><p>交接内容由家属记录，用于家庭协作整理，不替代医嘱或护理记录。</p></StatusPanel><form className="card form-grid" onSubmit={submit}><label>交接时间<input type="datetime-local" value={form.dateTime} onChange={(event) => update('dateTime', event.target.value)} required /></label><label className="full">今日变化<textarea value={form.changes} onChange={(event) => update('changes', event.target.value)} required /></label><label>已完成<textarea value={form.completed} onChange={(event) => update('completed', event.target.value)} /></label><label>未完成<textarea value={form.pending} onChange={(event) => update('pending', event.target.value)} /></label><label>明日事项<textarea value={form.nextDay} onChange={(event) => update('nextDay', event.target.value)} /></label><label>下一班注意<textarea value={form.note} onChange={(event) => update('note', event.target.value)} /></label><div className="form-actions full">{editingId && <button className="button ghost" type="button" onClick={() => { setEditingId(undefined); setForm(emptyHandoff()) }}>取消编辑</button>}<button className="button primary" type="submit">{editingId ? '保存修改' : '新增交接'}</button></div></form>{handoffs.length ? <div className="card-grid">{handoffs.map((item) => <article className="card" key={item.id}><span className="eyebrow">{new Date(item.dateTime).toLocaleString('zh-CN')}</span><h2>今日变化</h2><p>{item.changes}</p><p><strong>已完成：</strong>{item.completed || '无'}</p><p><strong>未完成：</strong>{item.pending || '无'}</p><p><strong>明日事项：</strong>{item.nextDay || '无'}</p><p><strong>下一班注意：</strong>{item.note || '无'}</p><button className="button secondary" type="button" onClick={() => edit(item)}>编辑</button></article>)}</div> : <EmptyState title="尚无交接记录" description="新增后可按时间倒序查看和编辑历史交接卡。" />}</InpatientGate></VisitWorkspace>
}

export function DischargePage() {
  const { state, visit, patient, saveDischargeItem, toggleDischargeItem, deleteDischargeItem, convertDischargeItemToTask } = useVisitContext()
  const [category, setCategory] = useState('材料领取')
  const [label, setLabel] = useState('')
  useUnsavedChanges(Boolean(label))
  if (!visit) return <RecordNotFound kind="就医事件" backTo="/visits" />
  const items = state.inpatient.dischargeItems.filter((item) => item.visitId === visit.id)
  const submit = (event: FormEvent) => { event.preventDefault(); if (!label.trim()) return; saveDischargeItem({ visitId: visit.id, category, label: label.trim() }); setLabel('') }
  const convert = (item: (typeof items)[number]) => {
    if (!window.confirm(`将“${item.label}”转为诊后行动任务吗？`)) return
    const type: TaskType = item.category.includes('药') ? 'medication' : item.category.includes('复查') ? 'follow_up' : /材料|票据/.test(item.category) ? 'document' : 'errand'
    convertDischargeItemToTask(item.id, { visitId: visit.id, patientId: visit.patientId, type, title: item.label, sourceType: 'discharge', sourceId: item.id, note: `来自出院清单：${item.category}` })
  }
  return <VisitWorkspace visit={visit} patient={patient} title="出院清单"><InpatientGate visit={visit}><StatusPanel title="办理边界"><p>此处只核对清单和生成后续任务，不判断医保报销、结算结果或用药方案。</p></StatusPanel><form className="card compact-form" onSubmit={submit}><label>类别<select value={category} onChange={(event) => setCategory(event.target.value)}><option>材料领取</option><option>结算票据</option><option>药品</option><option>交通</option><option>复查要求</option></select></label><label className="wide">清单事项<input value={label} onChange={(event) => setLabel(event.target.value)} required /></label><button className="button primary" type="submit">新增条目</button></form>{items.length ? <ul className="card item-list">{items.map((item) => <li key={item.id}><div><label className="inline-check"><input type="checkbox" checked={item.checked} onChange={() => toggleDischargeItem(item.id)} /><strong>{item.label}</strong></label><p>{item.category}{item.convertedTaskId ? ' · 已转为行动任务' : ''}</p></div><div className="button-row">{item.convertedTaskId ? <Link className="button ghost" to={`/visits/${visit.id}/tasks`}>查看任务</Link> : <button className="button secondary" type="button" onClick={() => convert(item)}>转行动任务</button>}<button className="button danger" type="button" onClick={() => window.confirm('确定删除该出院清单条目吗？') && deleteDischargeItem(item.id)}>删除</button></div></li>)}</ul> : <EmptyState title="出院清单尚无条目" description="可按材料、票据、药品、交通和复查要求逐项添加。" />}</InpatientGate></VisitWorkspace>
}
