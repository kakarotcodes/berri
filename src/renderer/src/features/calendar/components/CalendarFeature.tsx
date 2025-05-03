import React from 'react'
import { CalendarIcon } from './CalendarIcon'
import { FeatureCard } from '../../../components'

export const CalendarFeature: React.FC<{
  size?: 'small' | 'medium' | 'large'
  pillMode?: boolean
}> = ({ size = 'medium', pillMode = false }) => {
  const handleClick = (): void => {
    // Open Calendar in browser or show popup
    window.open('https://calendar.google.com', '_blank')
  }

  return (
    <FeatureCard
      size={size}
      icon={<CalendarIcon />}
      label="Calendar"
      onClick={handleClick}
      pillMode={pillMode}
    />
  )
}
