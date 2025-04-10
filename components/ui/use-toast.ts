// Adaptado de https://ui.shadcn.com/docs/components/toast
import { useState, useEffect, useCallback } from "react"

export type ToastProps = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

type Toast = {
  id: number
  props: ToastProps
}

type UseToastReturn = {
  toast: (props: ToastProps) => void
  dismissToast: (id: number) => void
  toasts: Toast[]
}

// Un hook simple para mostrar notificaciones
export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([])
  
  // Generar un ID único para cada toast
  const [id, setId] = useState(0)
  
  // Método para añadir un toast
  const toast = useCallback((props: ToastProps) => {
    const newId = id
    setId(prevId => prevId + 1)
    
    setToasts(prevToasts => [
      ...prevToasts,
      { id: newId, props }
    ])
    
    // Auto dismiss después de la duración (por defecto 3000ms)
    const duration = props.duration || 3000
    setTimeout(() => {
      dismissToast(newId)
    }, duration)
  }, [id])
  
  // Método para descartar un toast
  const dismissToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id))
  }, [])
  
  return {
    toast,
    dismissToast,
    toasts
  }
}

// Exportación para usar en otros archivos
export { useToast as toast }

export default useToast 