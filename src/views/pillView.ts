import { getBottomRightPosition } from '../utils/positioning'
import { ViewConfig } from './defaultView'

/**
 * Returns the configuration for the pill view
 * Pill view is a compact 200x48 bar placed at the bottom-right corner
 */
export function getPillViewConfig(): ViewConfig {
  const width = 200
  const height = 48
  const position = getBottomRightPosition(width, height)
  
  return {
    width,
    height,
    ...position,
    animationIn: 'fade-in'
  }
} 