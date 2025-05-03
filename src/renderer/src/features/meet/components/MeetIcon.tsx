import React from 'react'

export const MeetIcon: React.FC<{ size?: number }> = ({ size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="4" fill="#00897B" />
      <path
        d="M6 8C6 6.89543 6.89543 6 8 6H12C13.1046 6 14 6.89543 14 8V16C14 17.1046 13.1046 18 12 18H8C6.89543 18 6 17.1046 6 16V8Z"
        fill="white"
      />
      <path d="M15 9.5L19 7V17L15 14.5V9.5Z" fill="white" />
    </svg>
  )
}
