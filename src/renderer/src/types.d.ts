interface Window {
  api: {
    onHoverStateChange(arg0: (hovered: any) => void): unknown
    resizeToPill: () => void
    expandPill: () => void
    collapsePill: () => void
    movePill: (y: number) => void
    restoreWindow: () => void
    onWindowStateChange: (callback: (state: 'pill' | 'normal') => void) => void
  }
} 