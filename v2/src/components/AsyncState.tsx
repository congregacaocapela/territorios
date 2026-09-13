import { CircleAlert, LoaderCircle } from 'lucide-react'

export function LoadingState({ label, message }: { label?: string; message?: string }) {
  return (
    <div className="async-state">
      <LoaderCircle className="spin" />
      <p>{message ?? label ?? 'Carregando dados…'}</p>
    </div>
  )
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="async-state async-state--error">
      <CircleAlert />
      <div>
        <strong>Não foi possível carregar os dados.</strong>
        <p>{message || 'Confira a conexão e tente novamente.'}</p>
      </div>
    </div>
  )
}
