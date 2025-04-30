interface Window {
  api: {
    resizeToPill: () => void
    onWindowStateChange: (callback: (state: 'pill' | 'normal') => void) => void
  }
} 