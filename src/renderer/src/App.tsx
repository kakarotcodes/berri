import React, { useState, useEffect, useCallback, useMemo } from 'react'

function App(): React.JSX.Element {
  const [view, setView] = useState('full') // 'pill', 'hover', 'full'
  const [isPill, setIsPill] = useState(false)

  // Memoize the window state change handler
  const handleWindowStateChange = useCallback((state: 'pill' | 'normal') => {
    setIsPill(state === 'pill')
    // Update view state based on window state
    if (state === 'normal') {
      setView('full')
    } else {
      setView('pill')
    }
  }, [])

  useEffect(() => {
    // Listen for window state changes from main process
    window.api.onWindowStateChange(handleWindowStateChange)
    
    // Listen for hover state changes
    window.api.onHoverStateChange((hovered) => {
      if (isPill) {
        setView(hovered ? 'hover' : 'pill')
      }
    })

    // Handle visibility changes (system sleep/wake)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only report visibility change to main process
        // Let the main process decide what to do
        window.api.send?.('window-visibility-change', true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [handleWindowStateChange, isPill])

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

  // Memoize the header styles
  const headerStyles = useMemo(() => ({
    width: '100%',
    height: '40px',
    backgroundColor: '#ff0000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    WebkitAppRegion: 'drag' as const,
    cursor: 'default'
  }), [])

  return (
    <div className={`window ${view}`}>
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

          button {
            -webkit-app-region: no-drag;
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
          justifyContent: 'flex-start',
          margin: 0,
          padding: 0,
          borderRadius: '20px',
          overflow: 'hidden'
        }}
      >
        <div style={headerStyles}>
          Berri v1
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
        </div>
      </main>
    </div>
  )
}

function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export default App
