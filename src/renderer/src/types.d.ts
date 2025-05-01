interface Window {
  api: {
    resizeToPill: () => void
    expandPill: () => void
    collapsePill: () => void
    movePill: (y: number) => void
    restoreWindow: () => void
    onWindowStateChange: (callback: (state: 'pill' | 'normal') => void) => void
  }
} 