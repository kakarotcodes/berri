import { getBottomRightPosition } from '../utils/positioning'

export interface ViewConfig {
  width: number
  height: number
  x: number
  y: number
  animationIn?: string
  animationOut?: string
  styleTag?: string
}

/**
 * Returns the configuration for the default view
 * Default view is 512x288 placed at the bottom-right corner
 */
export function getDefaultViewConfig(): ViewConfig {
  const width = 512
  const height = 288
  const position = getBottomRightPosition(width, height)
  
  return {
    width,
    height,
    ...position
  }
} 