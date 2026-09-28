import './App.css'

function App() {
  const color = new URLSearchParams(window.location.search).get('color')

  return (
    <div className="app">
      <h1 style={color ? { color } : undefined}>Hello, World!</h1>
    </div>
  )
}

export default App
