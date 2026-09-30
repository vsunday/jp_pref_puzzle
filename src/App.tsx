import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const color = new URLSearchParams(window.location.search).get('color')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="app">
      <h1 style={color ? { color } : undefined}>Hello, World!</h1>
      <p>{now.toLocaleString()}</p>
    </div>
  )
}

export default App
