import React from 'react'
import { GmailFeature } from '../features/gmail'
import { CalendarFeature } from '../features/calendar'
import { MeetFeature } from '../features/meet'

type FeatureSize = 'small' | 'medium' | 'large'

interface FeaturesContainerProps {
  size: FeatureSize
  pillMode?: boolean
}

export const FeaturesContainer: React.FC<FeaturesContainerProps> = ({ size, pillMode = false }) => {
  // More compact spacing for pill mode
  const spacing = pillMode ? '2px' : size === 'small' ? '10px' : '20px'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: spacing,
        marginBottom: pillMode ? '0' : '20px',
        flexWrap: 'nowrap',
        justifyContent: 'center',
        alignItems: 'center',
        padding: pillMode ? '0' : '0 10px',
        maxWidth: '100%',
        height: pillMode ? '100%' : 'auto',
        // In pill mode, we don't want the container to handle clicks, just display icons
        pointerEvents: pillMode ? 'none' : 'auto'
      }}
      onClick={pillMode ? (e) => e.stopPropagation() : undefined}
    >
      <GmailFeature size={pillMode ? 'small' : size} pillMode={pillMode} />
      <CalendarFeature size={pillMode ? 'small' : size} pillMode={pillMode} />
      <MeetFeature size={pillMode ? 'small' : size} pillMode={pillMode} />
      {/* Add more features here in the future */}
    </div>
  )
}
