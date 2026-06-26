import { useState, useEffect } from 'react'

interface AlertProps {
  type: 'success' | 'error' | 'info'
  message: string
  onClose?: () => void
}

export default function Alert({ type, message, onClose }: AlertProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  if (!visible) return null

  return (
    <div className={`alert alert-${type}`}>
      <span>{message}</span>
      <button className="alert-close" onClick={() => { setVisible(false); onClose?.() }}>&times;</button>
    </div>
  )
}

// Simple notification state (no context needed for now — can be expanded)
export function useNotification() {
  const [notification, setNotification] = useState<{ type: AlertProps['type']; message: string } | null>(null)

  const notify = (type: AlertProps['type'], message: string) => {
    setNotification({ type, message })
  }

  const clear = () => setNotification(null)

  const NotificationDisplay = () =>
    notification ? (
      <Alert type={notification.type} message={notification.message} onClose={clear} />
    ) : null

  return { notify, NotificationDisplay }
}
