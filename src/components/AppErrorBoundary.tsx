import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error?: Error }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha ao iniciar a aplicação:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="startup-error">
        <p className="eyebrow">Configuração necessária</p>
        <h1>Não foi possível abrir a aplicação</h1>
        <p>{this.state.error.message}</p>
        <button className="button button--primary" onClick={() => window.location.reload()}>Tentar novamente</button>
      </main>
    )
  }
}
