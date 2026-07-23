import { NavLink, Outlet } from 'react-router-dom'
import { useAppStore } from '../../store/AppStoreContext'
import { selectCurrentVisit, selectPatient } from '../../store/selectors'
import { MedicalDisclaimer } from './MedicalDisclaimer'

const navItems = [
  { to: '/', label: '首页', end: true },
  { to: '/patients', label: '家庭成员' },
  { to: '/visits', label: '就医事件' },
  { to: '/settings', label: '设置与隐私' },
]

export function AppShell() {
  const { state } = useAppStore()
  const visit = selectCurrentVisit(state)
  const patient = visit ? selectPatient(state, visit.patientId) : undefined
  const saveLabel = state.saveState === 'error' ? '保存失败' : state.saveState === 'saved' ? '刚刚已保存' : '仅保存在本机'
  const saveTitle = state.lastSavedAt ? `最后保存：${new Date(state.lastSavedAt).toLocaleString('zh-CN')}` : '数据仅保存在当前浏览器'
  return (
    <div className="app-shell">
      <header className="brand-bar">
        <NavLink to="/" className="brand">诊前一步</NavLink>
        <span className="brand-subtitle">把就医信息与下一步行动放在一起</span>
        <div className="brand-context">
          {patient && <NavLink className="patient-context" to={`/patients/${patient.id}`}>{patient.displayName}</NavLink>}
          <span className={`save-indicator ${state.saveState}`} title={saveTitle} aria-live="polite">{saveLabel}</span>
        </div>
      </header>
      <div className="shell-body">
        <nav className="primary-nav" aria-label="一级导航">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => isActive ? 'active' : undefined}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="page-container" id="main-content">
          <Outlet />
          <MedicalDisclaimer />
        </main>
      </div>
    </div>
  )
}
