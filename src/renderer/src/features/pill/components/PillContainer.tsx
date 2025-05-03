import React, { useCallback } from 'react'
import { FeaturesContainer } from '../../../components'

interface PillContainerProps {
  onClick: (e: React.MouseEvent) => void
}

export const PillContainer: React.FC<PillContainerProps> = ({ onClick }) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onClick(e)
    },
    [onClick]
  )

  return (
    <div
      onClick={handleClick}
      onMouseDown={handleClick}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        borderRadius: '20px',
        cursor: 'pointer',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      {/* The feature icons should still be visible in pill mode */}
      <FeaturesContainer size="small" pillMode={true} />
    </div>
  )
}
