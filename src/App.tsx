import { MapPinned } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LoadingState } from './components/AsyncState'

const AdminLayout = lazy(() => import('./components/Layouts').then((module) => ({ default: module.AdminLayout })))
const ControlPanelPage = lazy(() => import('./pages/ControlPanelPage').then((module) => ({ default: module.ControlPanelPage })))
const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const ManagementPage = lazy(() => import('./pages/ManagementPage').then((module) => ({ default: module.ManagementPage })))
const PortalPage = lazy(() => import('./pages/PortalPage').then((module) => ({ default: module.PortalPage })))
const S13Page = lazy(() => import('./pages/S13Page').then((module) => ({ default: module.S13Page })))
const TerritoryPage = lazy(() => import('./pages/TerritoryPage').then((module) => ({ default: module.TerritoryPage })))

function LegacyOrNotFound() {
  const location = useLocation()
  const legacyTerritory = location.pathname.match(/\/territorio_(\d+)\.html$/)
  if (legacyTerritory) return <Navigate replace to={`/territorio/${legacyTerritory[1]}`} />

  return <main className="not-found"><MapPinned /><p className="eyebrow">Erro 404</p><h1>Página não encontrada</h1><p>O endereço pode ter mudado na nova versão.</p><a className="button button--primary" href="/">Ir para o início</a></main>
}

export default function App() {
  return (
    <Suspense fallback={<LoadingState message="Abrindo aplicação…" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/portal" element={<PortalPage />} />
        <Route path="/territorio/:id" element={<TerritoryPage />} />
        <Route path="/portaldeterritorios.html" element={<Navigate replace to="/portal" />} />
        <Route path="/paineldecontrole.html" element={<Navigate replace to="/admin/painel" />} />
        <Route path="/gestaodequadras.html" element={<Navigate replace to="/admin/territorios" />} />
        <Route path="/s13.html" element={<Navigate replace to="/admin/s13" />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate replace to="painel" />} />
          <Route path="painel" element={<ControlPanelPage />} />
          <Route path="territorios" element={<ManagementPage />} />
          <Route path="s13" element={<S13Page />} />
        </Route>
        <Route path="*" element={<LegacyOrNotFound />} />
      </Routes>
    </Suspense>
  )
}
