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

  // Common styles
  const commonStyles = {
    backgroundColor: '#1a1a1a',
    color: 'white',
  }

  return (
    <>
      <style>
        {`
          :root {
            background-color: ${commonStyles.backgroundColor};
          }
          
          html, body, #root {
            margin: 0;
            padding: 0;
            background-color: ${commonStyles.backgroundColor};
            color: ${commonStyles.color};
            height: 100%;
            width: 100%;
          }
        `}
      </style>
      <main
        style={{
          width: '100vw',
          height: '100vh',
          ...commonStyles,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          padding: 0,
          borderRadius: '20px',
          overflow: 'hidden'
        }}
      >
        <p>Berri v1</p>
        {!isPill && (
          <button
            onClick={() => window.api.resizeToPill()}
            style={{
              padding: '8px 16px',
              backgroundColor: commonStyles.backgroundColor,
              color: commonStyles.color,
              border: '1px solid #333',
              borderRadius: '8px',
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
              backgroundColor: commonStyles.backgroundColor,
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
