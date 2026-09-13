import { Building2, ClipboardList, Home, Map, Menu, Route, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { AdminGuard } from './AdminGuard'
import { ControlDataProvider } from '../contexts/ControlDataContext'

interface PublicHeaderProps {
  hideNav?: boolean
}

export function PublicHeader({ hideNav = false }: PublicHeaderProps) {
  return (
    <header className={hideNav ? 'public-header public-header--minimal' : 'public-header'}>
      <Link to="/" className="brand-link" aria-label="Página inicial">
        <span className="brand-mark"><Route /></span>
        <span><strong>Territórios</strong><small>Congregação Capela</small></span>
      </Link>
      {!hideNav && (
        <nav>
          <NavLink to="/portal">Explorar territórios</NavLink>
          <NavLink to="/admin/painel">Administração</NavLink>
        </nav>
      )}
    </header>
  )
}

const adminLinks = [
  { to: '/admin/painel', label: 'Painel', icon: Home },
  { to: '/admin/territorios', label: 'Territórios', icon: Map },
  { to: '/admin/s13', label: 'S-13', icon: ClipboardList },
]

function AdminLayoutInner() {
  const [open, setOpen] = useState(false)
  return (
    <div className="admin-shell">
      <aside className={open ? 'admin-sidebar is-open' : 'admin-sidebar'}>
        <div className="admin-sidebar__brand">
          <span className="brand-mark"><Building2 /></span>
          <div><strong>Territórios</strong><small>Administração v2</small></div>
          <button className="mobile-only icon-button" onClick={() => setOpen(false)} aria-label="Fechar menu"><X /></button>
        </div>
        <nav>
          {adminLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              <Icon size={20} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <Link className="sidebar-public-link" to="/portal"><Route size={18} /> Abrir portal público</Link>
      </aside>
      {open && <button className="sidebar-backdrop" onClick={() => setOpen(false)} aria-label="Fechar menu" />}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="mobile-only icon-button" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></button>
          <div><span className="eyebrow">Sistema integrado</span><strong>Gestão em tempo real</strong></div>
          <span className="live-pill"><i /> Firestore conectado</span>
        </header>
        <Outlet />
      </div>
    </div>
  )
}

export function AdminLayout() {
  return (
    <AdminGuard>
      <ControlDataProvider>
        <AdminLayoutInner />
      </ControlDataProvider>
    </AdminGuard>
  )
}
