import React, { ReactNode } from 'react'

type FeatureSize = 'small' | 'medium' | 'large'

interface FeatureCardProps {
  size: FeatureSize
  icon: ReactNode
  label: string
  onClick: () => void
  pillMode?: boolean
  disabled?: boolean
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  size,
  icon,
  label,
  onClick,
  pillMode = false,
  disabled = false
}) => {
  // Set sizes based on the prop
  const getFontSize = (): string => {
    if (pillMode) return '0px' // Hide text in pill mode

    switch (size) {
      case 'small':
        return '10px'
      case 'large':
        return '14px'
      default:
        return '12px' // medium
    }
  }

  const getPadding = (): string => {
    if (pillMode) return '2px'

    switch (size) {
      case 'small':
        return '6px'
      case 'large':
        return '12px'
      default:
        return '10px' // medium
    }
  }

  const getIconSize = (): number => {
    if (pillMode) return 16 // Even smaller icon in pill mode for better fit

    switch (size) {
      case 'small':
        return 24
      case 'large':
        return 40
      default:
        return 32 // medium
    }
  }

  // Scale the icon if needed
  const scaledIcon = React.cloneElement(icon as React.ReactElement, {
    size: getIconSize()
  })

  return (
    <div
      onClick={pillMode || disabled ? undefined : onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: pillMode || disabled ? 'default' : 'pointer',
        padding: getPadding(),
        borderRadius: '8px',
        transition: 'background-color 0.2s, opacity 0.2s',
        backgroundColor: 'transparent',
        maxWidth: '100%',
        flexShrink: 0,
        opacity: disabled ? 0.5 : pillMode ? 0.8 : 1,
        // In pill mode, don't handle clicks directly
        pointerEvents: pillMode || disabled ? 'none' : 'auto'
      }}
      onMouseOver={
        pillMode || disabled
          ? undefined
          : (e) => {
              e.currentTarget.style.backgroundColor = '#333'
            }
      }
      onMouseOut={
        pillMode || disabled
          ? undefined
          : (e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
      }
    >
      {scaledIcon}
      {!pillMode && (
        <span
          style={{
            marginTop: '5px',
            fontSize: getFontSize(),
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%'
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
