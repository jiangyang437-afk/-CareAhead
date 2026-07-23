import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/common/AppShell'
import { HomePage } from './pages/HomePage'
import { HistoryPage, NotFoundPage, SettingsPage, SharePreviewPage } from './pages/OtherPages'
import { PatientDetailPage, PatientFormPage, PatientsPage } from './pages/PatientsPages'
import { VisitFormPage, VisitOverviewPage, VisitsPage } from './pages/VisitsPages'
import { DischargePage, DoctorNotesPage, HandoffPage, InpatientTasksPage, PrepPage, SummaryPage, TasksPage } from './pages/WorkflowPages'
import { AppStoreProvider } from './store/AppStore'

export default function App() {
  return (
    <AppStoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/new" element={<PatientFormPage />} />
            <Route path="patients/:patientId" element={<PatientDetailPage />} />
            <Route path="patients/:patientId/edit" element={<PatientFormPage />} />
            <Route path="visits" element={<VisitsPage />} />
            <Route path="visits/new" element={<VisitFormPage />} />
            <Route path="visits/:visitId" element={<VisitOverviewPage />} />
            <Route path="visits/:visitId/prep" element={<PrepPage />} />
            <Route path="visits/:visitId/notes" element={<DoctorNotesPage />} />
            <Route path="visits/:visitId/tasks" element={<TasksPage />} />
            <Route path="visits/:visitId/summary" element={<SummaryPage />} />
            <Route path="visits/:visitId/inpatient/tasks" element={<InpatientTasksPage />} />
            <Route path="visits/:visitId/inpatient/handoff" element={<HandoffPage />} />
            <Route path="visits/:visitId/inpatient/discharge" element={<DischargePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="share-preview/:visitId" element={<SharePreviewPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppStoreProvider>
  )
}
