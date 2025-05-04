import { screen } from 'electron'

/**
 * Calculates the position for placing a window at the bottom-right corner of the screen
 * @param width The width of the window
 * @param height The height of the window
 * @param marginX The margin from the right edge of the screen (default: 20)
 * @param marginY The margin from the bottom edge of the screen (default: 20)
 * @returns The x and y coordinates for positioning the window
 */
export function getBottomRightPosition(
  width: number, 
  height: number, 
  marginX = 20, 
  marginY = 20
): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { bounds } = primaryDisplay
  
  return {
    x: bounds.width - width - marginX,
    y: bounds.height - height - marginY
  }
} 