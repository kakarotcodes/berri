interface Window {
  api: {
    resizeToPill: () => void
    expandPill: () => void
    collapsePill: () => void
    onWindowStateChange: (callback: (state: 'pill' | 'normal') => void) => void
  }
} 