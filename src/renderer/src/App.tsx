import { useState, useEffect } from 'react'

function App(): React.JSX.Element {
  const [isPill, setIsPill] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    // Listen for window state changes from main process
    window.api.onWindowStateChange((state) => {
      setIsPill(state === 'pill')
    })

    // Listen for hover state changes from main process
    window.api.onHoverStateChange((hovered) => {
      setIsHovered(hovered)
    })
  }, [])

  const handlePillClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isPill) {
      window.api.restoreWindow()
    }
  }

  return (
    <>
      <style>
        {`
          body {
            margin: 0;
            padding: 0;
            background-color: #1a1a1a;
          }
        `}
      </style>
      <main style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#1a1a1a',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0
      }}>
        <p>Berri v1</p>
        {!isPill && (
          <button 
            onClick={() => window.api.resizeToPill()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Resize to pill
          </button>
        )}
        {isPill && (
          <div 
            onClick={handlePillClick}
            onMouseDown={handlePillClick}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: '#333',
              borderRadius: '20px',
              cursor: 'pointer',
              pointerEvents: 'auto',
              transition: 'background-color 0.3s ease'
            }}
          />
        )}
      </main>
    </>
  )
}

export default App
