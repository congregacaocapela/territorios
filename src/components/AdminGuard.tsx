import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { LockKeyhole, ShieldAlert } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { controlAuth, territoriesAuth } from '../lib/firebase'

// Builds públicos ficam protegidos mesmo se a variável não for configurada.
// Apenas o modo de desenvolvimento local desativa a proteção explicitamente.
const authRequired = import.meta.env.VITE_REQUIRE_ADMIN_AUTH !== 'false'

export function AdminGuard({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(controlAuth.currentUser)
  const [checking, setChecking] = useState(authRequired)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authRequired) return
    return onAuthStateChanged(controlAuth, (next) => {
      setUser(next)
      setChecking(false)
    })
  }, [])

  async function login(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const credentials = email.trim()
      await Promise.all([
        signInWithEmailAndPassword(controlAuth, credentials, password),
        signInWithEmailAndPassword(territoriesAuth, credentials, password),
      ])
    } catch {
      await Promise.allSettled([signOut(controlAuth), signOut(territoriesAuth)])
      setError('Não foi possível entrar. Confira o usuário e a configuração do Firebase Authentication.')
    }
  }

  if (checking) return <div className="admin-login"><p>Verificando acesso…</p></div>

  if (authRequired && !user) {
    return (
      <main className="admin-login">
        <form className="admin-login__card" onSubmit={login}>
          <div className="brand-mark brand-mark--large"><LockKeyhole /></div>
          <p className="eyebrow">Área administrativa</p>
          <h1>Entre para continuar</h1>
          <p>Use uma conta autorizada no projeto Firebase do painel.</p>
          <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="inline-alert inline-alert--error">{error}</div>}
          <button className="button button--primary" type="submit">Entrar</button>
        </form>
      </main>
    )
  }

  return (
    <>
      {!authRequired && (
        <div className="security-banner">
          <ShieldAlert size={17} />
          <span>Modo de migração: ative o Firebase Authentication e as regras antes da publicação definitiva.</span>
        </div>
      )}
      {authRequired && user && (
        <button className="admin-signout" onClick={() => Promise.allSettled([signOut(controlAuth), signOut(territoriesAuth)])}>Sair</button>
      )}
      {children}
    </>
  )
}
