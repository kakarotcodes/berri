import { getBottomRightPosition } from '../utils/positioning'
import { ViewConfig } from './defaultView'

/**
 * Returns the configuration for the hover view
 * Hover view is medium-sized (300x180) showing more details on hover
 */
export function getHoverViewConfig(): ViewConfig {
  const width = 300
  const height = 180
  const position = getBottomRightPosition(width, height)
  
  return {
    width,
    height,
    ...position,
    animationIn: 'expand-up'
  }
} 