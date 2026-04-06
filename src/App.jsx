// src/App.jsx
import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import AppPC from './AppPC'
import AppMobile from './AppMobile'

function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const props = { user, loading, signInWithGoogle, signOut }

  if (isMobile) return <AppMobile {...props} />
  return <AppPC {...props} />
}

export default App