import { useEffect, useState } from 'react'

export default function NetworkStatusBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online) return null

  return (
    <div role="status" style={{ position: 'fixed', inset: '0 0 auto', zIndex: 2000, background: '#991b1b', color: '#fff', padding: '8px 16px', textAlign: 'center' }}>
      Mất kết nối mạng. Các thao tác ghi dữ liệu đang tạm dừng.
    </div>
  )
}
