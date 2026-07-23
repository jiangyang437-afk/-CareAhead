import { Link } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeader } from '../components/common/PageHeader'
import { StatusPanel } from '../components/common/StatusPanel'
import { buildVisitChecklist } from '../domain/visitChecklist'
import { useAppStore } from '../store/AppStoreContext'
import { selectCurrentVisit, selectPatient } from '../store/selectors'

const statusLabels = { draft: '草稿', preparing: '诊前准备中', in_progress: '就医进行中', follow_up: '诊后执行中', completed: '已完成', archived: '已归档' } as const

export function HomePage() {
  const { state } = useAppStore()
  const visit = selectCurrentVisit(state)
  const patient = visit ? selectPatient(state, visit.patientId) : undefined
  const checklist = visit ? buildVisitChecklist(state, visit) : []
  const nextItem = checklist.find((item) => !item.complete)
  const completedCount = checklist.filter((item) => item.complete).length
  const pendingTasks = state.tasks
    .filter((task) => task.status === 'pending')
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    .slice(0, 4)

  return (
    <>
      <PageHeader title={patient ? `你好，今天先照顾好 ${patient.displayName}` : '把这次就医整理清楚'} subtitle="不用一次填完，先完成最重要的下一步。" action={<Link className="button secondary" to="/visits/new">＋ 创建事件</Link>} />
      {state.loadStatus === 'corrupted' && <StatusPanel title="本地数据无法读取" tone="error"><p>{state.storageError} 请前往设置清空并恢复安全空状态。</p></StatusPanel>}

      {!visit ? <EmptyState title="还没有当前就医事件" description="先创建一位家庭成员，再为这次门诊、复诊或住院建立事件。" actionLabel="创建家庭成员" actionTo="/patients/new" /> : <>
        <section className="care-dashboard">
          <div className="care-dashboard-main">
            <div className="event-meta"><span className="status-dot" />{statusLabels[visit.status]} · {new Date(visit.date).toLocaleDateString('zh-CN')}</div>
            <h2>{visit.purpose}</h2>
            <p>{visit.hospital ?? '医院待补充'} · {visit.department ?? '科室待补充'}</p>
            {nextItem ? <div className="next-action"><span>建议下一步</span><strong>{nextItem.label}</strong><p>{nextItem.hint}</p><Link className="button primary" to={nextItem.to}>现在去完成 →</Link></div> : <div className="next-action complete"><span>本次信息已整理</span><strong>可以查看或打印一页摘要</strong><Link className="button primary" to={`/visits/${visit.id}/summary`}>查看摘要 →</Link></div>}
          </div>
          <div className="completion-ring" aria-label={`已完成 ${completedCount} / ${checklist.length} 项`}><strong>{completedCount}/{checklist.length}</strong><span>准备事项</span></div>
        </section>

        <section className="card checklist-card">
          <div className="section-heading"><div><span className="eyebrow">本次事件</span><h2>准备清单</h2></div><Link to={`/visits/${visit.id}`}>查看事件</Link></div>
          <div className="journey-list">{checklist.map((item, index) => {
            const active = item.id === nextItem?.id
            return <Link className={`journey-row ${item.complete ? 'complete' : ''} ${active ? 'active' : ''}`} to={item.to} key={item.id}><span className="journey-index">{item.complete ? '✓' : index + 1}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span><span className="journey-status">{item.complete ? '已完成' : active ? '下一步' : '待开始'}</span></Link>
          })}</div>
        </section>
      </>}

      <div className="two-column home-secondary">
        <section className="card">
          <div className="section-heading"><div><span className="eyebrow">待办</span><h2>近期行动</h2></div>{visit && <Link to={`/visits/${visit.id}/tasks`}>查看全部</Link>}</div>
          {pendingTasks.length ? <ul className="action-list">{pendingTasks.map((task) => {
            const owner = selectPatient(state, task.patientId)
            const overdue = Boolean(task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10))
            return <li key={task.id}><span className={`action-date ${overdue ? 'overdue' : ''}`}>{task.dueDate ? task.dueDate.slice(5) : '待定'}</span><span><strong>{task.title}</strong><small>{owner?.displayName ?? '未知患者'} · {task.assigneeRole ?? '负责人待定'}</small></span></li>
          })}</ul> : <p className="muted">目前没有未完成任务。</p>}
        </section>
        <section className="card">
          <div className="section-heading"><div><span className="eyebrow">家庭</span><h2>照护对象</h2></div><Link to="/patients/new">＋ 添加</Link></div>
          {state.patients.length ? <div className="patient-switcher">{state.patients.map((item) => <Link className={item.id === patient?.id ? 'active' : ''} to={`/patients/${item.id}`} key={item.id}><span>{item.displayName.slice(0, 1)}</span><strong>{item.displayName}</strong><small>{item.relation}</small></Link>)}</div> : <p className="muted">尚未添加家庭成员。</p>}
        </section>
      </div>
    </>
  )
}
