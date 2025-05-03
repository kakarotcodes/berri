import React from 'react'

export const CalendarIcon: React.FC<{ size?: number }> = ({ size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="2" fill="#4285F4" />
      <rect x="3" y="6" width="18" height="15" rx="1" fill="white" />
      <rect x="7" y="2" width="2" height="4" rx="1" fill="white" />
      <rect x="15" y="2" width="2" height="4" rx="1" fill="white" />
      <rect x="6" y="10" width="3" height="3" rx="0.5" fill="#4285F4" />
      <rect x="11" y="10" width="3" height="3" rx="0.5" fill="#4285F4" />
      <rect x="16" y="10" width="3" height="3" rx="0.5" fill="#4285F4" />
      <rect x="6" y="15" width="3" height="3" rx="0.5" fill="#4285F4" />
      <rect x="11" y="15" width="3" height="3" rx="0.5" fill="#4285F4" />
    </svg>
  )
}
