import { useState, useEffect, useCallback, useMemo } from 'react'

function App(): React.JSX.Element {
  const [isPill, setIsPill] = useState(false)

  // Memoize the window state change handler
  const handleWindowStateChange = useCallback((state: 'pill' | 'normal') => {
    setIsPill(state === 'pill')
  }, [])

  useEffect(() => {
    // Listen for window state changes from main process
    window.api.onWindowStateChange(handleWindowStateChange)
    
    // Cleanup
    return () => {
      // Note: In a real app, you'd need to implement a way to remove the listener
      // This is just a placeholder for the cleanup
    }
  }, [handleWindowStateChange])

  // Memoize the pill click handler
  const handlePillClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isPill) {
      window.api.restoreWindow()
    }
  }, [isPill])

  // Memoize common styles
  const commonStyles = useMemo(() => ({
    backgroundColor: '#1a1a1a',
    color: 'white',
  }), [])

  // Memoize the button styles
  const buttonStyles = useMemo(() => ({
    padding: '8px 16px',
    backgroundColor: commonStyles.backgroundColor,
    color: commonStyles.color,
    border: '1px solid #333',
    borderRadius: '8px',
    cursor: 'pointer'
  }), [commonStyles])

  // Memoize the pill container styles
  const pillContainerStyles = useMemo(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: commonStyles.backgroundColor,
    borderRadius: '20px',
    cursor: 'pointer' as const,
    pointerEvents: 'auto' as const
  }), [commonStyles])

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
            style={buttonStyles}
          >
            Resize to pill
          </button>
        )}
        {isPill && (
          <div
            onClick={handlePillClick}
            onMouseDown={handlePillClick}
            style={pillContainerStyles}
          />
        )}
      </main>
    </>
  )
}

export default App
