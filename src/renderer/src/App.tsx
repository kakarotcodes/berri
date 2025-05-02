import React, { useState, useEffect, useCallback, useMemo } from 'react'

// ExpandedView Component
const ExpandedView: React.FC<{ onPillClick: () => void; styles: any }> = ({
  onPillClick,
  styles
}) => {
  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        ...styles.common,
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
      <div style={styles.header}>Berri v1</div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <button onClick={onPillClick} style={styles.button}>
          Resize to pill
        </button>
      </div>
    </main>
  )
}

// PillView Component
const PillView: React.FC<{ onPillClick: (e: React.MouseEvent) => void; styles: any }> = ({
  onPillClick,
  styles
}) => {
  return <div onClick={onPillClick} onMouseDown={onPillClick} style={styles.pillContainer} />
}

// HoverView Component
const HoverView: React.FC<{ onPillClick: (e: React.MouseEvent) => void; styles: any }> = ({
  onPillClick,
  styles
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'yellow',
        padding: 0,
        margin: 0,
        position: 'relative'
      }}
    >
      <div
        style={{
          ...styles.header,
          height: '30px',
          fontSize: '14px',
          backgroundColor: '#f5455c',
          width: '100%',
          padding: 0,
          margin: 0
        }}
      >
        Berri v1
      </div>
      <button
        onClick={onPillClick}
        style={{
          background: 'blue',
          color: 'white',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5px',
          width: '100%'
        }}
      >
        Click to expand
      </button>

      {/* Green drag handle */}
      <div
        style={{
          width: '100%',
          height: '40px',
          backgroundColor: '#00FF00',
          position: 'absolute',
          bottom: 0,
          left: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderTop: '2px solid white',
          cursor: 'grab',
          userSelect: 'none' as const
        }}
        onMouseDown={(e) => {
          // Prevent click from bubbling to parent
          e.stopPropagation()

          // Set up initial state
          const startY = e.clientY

          // Function to handle mousemove during drag
          function onMouseMove(e: MouseEvent) {
            // Send move message to main process
            window.electron.ipcRenderer.send('window-drag', 0, e.clientY - startY)
          }

          // Function to handle mouseup at end of drag
          function onMouseUp() {
            // Save the final position for the pill
            window.electron.ipcRenderer.send('save-pill-position')

            // Clean up event listeners
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
          }

          // Add event listeners
          document.addEventListener('mousemove', onMouseMove)
          document.addEventListener('mouseup', onMouseUp)
        }}
      >
        <div
          style={{
            width: '80px',
            height: '6px',
            backgroundColor: 'white',
            borderRadius: '3px'
          }}
        />
      </div>
    </div>
  )
}

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
  const handlePillClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isPill) {
        window.api.restoreWindow()
      }
    },
    [isPill]
  )

  // Memoize the resize to pill handler
  const handleResizeToPill = useCallback(() => {
    window.api.resizeToPill()
  }, [])

  // Memoize common styles
  const commonStyles = useMemo(
    () => ({
      backgroundColor: '#1a1a1a',
      color: 'white'
    }),
    []
  )

  // Memoize the button styles
  const buttonStyles = useMemo(
    () => ({
      padding: '8px 16px',
      backgroundColor: commonStyles.backgroundColor,
      color: commonStyles.color,
      border: '1px solid #333',
      borderRadius: '8px',
      cursor: 'pointer'
    }),
    [commonStyles]
  )

  // Memoize the pill container styles
  const pillContainerStyles = useMemo(
    () => ({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: commonStyles.backgroundColor,
      borderRadius: '20px',
      cursor: 'pointer' as const,
      pointerEvents: 'auto' as const
    }),
    [commonStyles]
  )

  // Memoize the header styles
  const headerStyles = useMemo(
    () => ({
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
    }),
    []
  )

  // Memoize all styles together
  const styles = useMemo(
    () => ({
      common: commonStyles,
      button: buttonStyles,
      pillContainer: pillContainerStyles,
      header: headerStyles
    }),
    [commonStyles, buttonStyles, pillContainerStyles, headerStyles]
  )

  // Render the appropriate view component based on current state
  const renderView = () => {
    switch (view) {
      case 'full':
        return <ExpandedView onPillClick={handleResizeToPill} styles={styles} />
      case 'pill':
        return <PillView onPillClick={handlePillClick} styles={styles} />
      case 'hover':
        return <HoverView onPillClick={handlePillClick} styles={styles} />
      default:
        return <ExpandedView onPillClick={handleResizeToPill} styles={styles} />
    }
  }

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
      {renderView()}
    </div>
  )
}

export default App
