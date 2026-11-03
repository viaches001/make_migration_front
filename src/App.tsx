import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ScenariosPage } from '@/pages/ScenariosPage'
import { ScenarioDetailPage } from '@/pages/ScenarioDetailPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ScenariosPage />} />
        <Route path="scenarios/:id" element={<ScenarioDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
