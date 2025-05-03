import React from 'react'
import { GmailIcon } from './GmailIcon'
import { FeatureCard } from '../../../components'

export const GmailFeature: React.FC<{
  size?: 'small' | 'medium' | 'large'
  pillMode?: boolean
}> = ({ size = 'medium', pillMode = false }) => {
  const handleClick = (): void => {
    // Open Gmail in browser or show popup
    window.open('https://mail.google.com', '_blank')
  }

  return (
    <FeatureCard
      size={size}
      icon={<GmailIcon />}
      label="Gmail"
      onClick={handleClick}
      pillMode={pillMode}
    />
  )
}
