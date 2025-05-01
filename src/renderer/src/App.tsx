import { useState, useEffect, useRef } from 'react'

function App(): React.JSX.Element {
  const [isPill, setIsPill] = useState(false)
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Listen for window state changes from main process
    window.api.onWindowStateChange((state) => {
      setIsPill(state === 'pill')
    })
  }, [])

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
            onClick={() => {
              // Clear any pending timeouts
              if (expandTimeoutRef.current) {
                clearTimeout(expandTimeoutRef.current)
                expandTimeoutRef.current = null
              }
              if (collapseTimeoutRef.current) {
                clearTimeout(collapseTimeoutRef.current)
                collapseTimeoutRef.current = null
              }
              // Restore to original state
              window.api.restoreWindow()
            }}
            onMouseEnter={() => {
              // Clear any pending collapse
              if (collapseTimeoutRef.current) {
                clearTimeout(collapseTimeoutRef.current)
                collapseTimeoutRef.current = null
              }
              // Set expand timeout
              expandTimeoutRef.current = setTimeout(() => {
                window.api.expandPill()
              }, 500)
            }}
            onMouseLeave={() => {
              // Clear any pending expand
              if (expandTimeoutRef.current) {
                clearTimeout(expandTimeoutRef.current)
                expandTimeoutRef.current = null
              }
              // Set collapse timeout
              collapseTimeoutRef.current = setTimeout(() => {
                window.api.collapsePill()
              }, 800)
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          />
        )}
      </main>
    </>
  )
}

export default App
