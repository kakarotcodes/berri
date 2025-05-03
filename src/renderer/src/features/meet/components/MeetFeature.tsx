import React, { useState } from 'react'
import { MeetIcon } from './MeetIcon'
import { FeatureCard } from '../../../components'
import { createMeeting } from '../services/meetService'

export const MeetFeature: React.FC<{
  size?: 'small' | 'medium' | 'large'
  pillMode?: boolean
}> = ({ size = 'medium', pillMode = false }) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async (): Promise<void> => {
    if (isLoading) return // Prevent multiple clicks

    try {
      setIsLoading(true)
      // Get the meeting URL from the service
      const meetingUrl = await createMeeting()
      // Open the meeting in a new tab
      window.open(meetingUrl, '_blank')
    } catch (error) {
      console.error('Error starting Google Meet:', error)
      // Fallback to direct URL if there's an error
      window.open('https://meet.google.com/new', '_blank')
    } finally {
      // Short delay to show the loading state even if operation is quick
      setTimeout(() => setIsLoading(false), 500)
    }
  }

  return (
    <FeatureCard
      size={size}
      icon={<MeetIcon />}
      label={isLoading ? 'Starting...' : 'Meet'}
      onClick={handleClick}
      pillMode={pillMode}
      disabled={isLoading}
    />
  )
}
