import { BrowserWindow, screen } from 'electron'

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time it was invoked
 * 
 * @param func The function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function(...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
      timeout = null
    }, wait)
  }
}

/**
 * Ensures that a BrowserWindow stays completely within the visible work area of the primary display
 * This function focuses on keeping the window from being dragged below the screen
 * 
 * @param window The BrowserWindow to constrain to the work area
 * @param jumpToBottom If true, repositions the window at the bottom of the screen when out of bounds
 */
export function clampWindowToWorkArea(window: BrowserWindow, jumpToBottom = true): void {
  // Get the work area of the primary display (area not occupied by taskbars/docks)
  const workArea = screen.getPrimaryDisplay().workArea
  
  // Get current window bounds
  const bounds = window.getBounds()
  
  // Initialize variables to track if adjustments are needed
  let needsAdjustment = false
  const newBounds = { ...bounds }
  
  // Check if window exceeds bottom edge
  if (bounds.y + bounds.height > workArea.y + workArea.height) {
    if (jumpToBottom) {
      // Position the window at the bottom edge of the screen
      newBounds.y = workArea.y + workArea.height - bounds.height
    } else {
      // Alternatively, we could restrict the movement only to the visible portion
      // newBounds.y = Math.min(bounds.y, workArea.y + workArea.height - bounds.height);
      newBounds.y = workArea.y + workArea.height - bounds.height
    }
    needsAdjustment = true
  }
  
  // Apply new bounds if adjustments were needed
  if (needsAdjustment) {
    window.setBounds(newBounds)
  }
}

/**
 * Creates a debounced version of the clampWindowToWorkArea function
 * to avoid glitchy behavior during window dragging
 * 
 * @param window The BrowserWindow to constrain
 * @param delayMs Debounce delay in milliseconds (default: 200ms)
 * @returns A debounced clamping function
 */
export function createDebouncedWindowClamper(
  window: BrowserWindow,
  delayMs = 100
): () => void {
  return debounce(() => clampWindowToWorkArea(window, true), delayMs)
} 