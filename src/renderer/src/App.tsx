import { useState, useEffect, useCallback, useMemo } from 'react'
import { PillContainer } from './features/pill'
import { FeaturesContainer } from './components'

function App(): React.JSX.Element {
  const [isPill, setIsPill] = useState(false)
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: window.innerWidth,
    height: window.innerHeight
  })

  // Detect window size changes
  useEffect(() => {
    const handleResize = (): void => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Determine feature size based on window width
  const featureSize = useMemo(() => {
    if (windowSize.width < 300) return 'small'
    if (windowSize.width > 500) return 'large'
    return 'medium'
  }, [windowSize.width])

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
    }
  }, [handleWindowStateChange])

  // Handle pill click
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
      cursor: 'pointer',
      fontSize: featureSize === 'small' ? '12px' : '14px'
    }),
    [commonStyles, featureSize]
  )

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
        {!isPill ? (
          <>
            <p
              style={{
                marginBottom: '20px',
                fontSize:
                  featureSize === 'small' ? '16px' : featureSize === 'large' ? '24px' : '20px',
                textAlign: 'center',
                padding: '0 10px'
              }}
            >
              Berri v1
            </p>
            <FeaturesContainer size={featureSize} />
            <button onClick={() => window.api.resizeToPill()} style={buttonStyles}>
              Resize to pill
            </button>
          </>
        ) : (
          <PillContainer onClick={handlePillClick} />
        )}
      </main>
    </>
  )
}

export default App
