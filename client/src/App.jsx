import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import AppLayout from './components/layout/AppLayout.jsx'
import AuthLayout from './components/layout/AuthLayout.jsx'
import ArchivePage from './pages/ArchivePage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PermitFormPage from './pages/PermitFormPage.jsx'

export default function App() {
  const location = useLocation()

  return (
    // `mode="wait"` lets the outgoing page finish fading before the next one
    // mounts, which keeps the sticky form footer from double-rendering.
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/permise" element={<PermitFormPage />} />
          <Route path="/arhiva" element={<ArchivePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}
