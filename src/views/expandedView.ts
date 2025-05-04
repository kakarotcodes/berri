import { getBottomRightPosition } from '../utils/positioning'
import { ViewConfig } from './defaultView'

/**
 * Returns the configuration for the expanded view
 * Expanded view is a full-featured view (512x480) with all details and controls
 */
export function getExpandedViewConfig(): ViewConfig {
  const width = 512
  const height = 480
  const position = getBottomRightPosition(width, height)
  
  return {
    width,
    height,
    ...position,
    animationIn: 'expand-up'
  }
} 