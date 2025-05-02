import { app, shell, BrowserWindow, ipcMain, screen, powerMonitor } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initialize, enable } from '@electron/remote/main'

// Initialize remote module
initialize()

// Store default window size and position
const DEFAULT_WINDOW = {
  width: 512,
  height: 288,
  margin: 30
}

// Animation constants
const ANIMATION = {
  DURATION: 350,
  INTERVAL: 16,
  PILL: {
    WIDTH: 100,
    HEIGHT: 40,
    HIDDEN_PERCENT: 0.4,
    TOP_MARGIN: 135
  },
  HOVER: {
    WIDTH: 240,
    HEIGHT: 240
  },
  GPU: {
    ENABLED: true,
    MAX_FPS: 60,
    MIN_FPS: 30,
    QUALITY: 'high'
  },
  OPACITY: {
    NORMAL: 1,
    PILL: 0.7,
    TRANSITION_DURATION: 200
  }
}

// Track window state
let isPill = false
let isHovered = false
let isAnimating = false
let mouseTrackingInterval: NodeJS.Timeout | null = null
let mainWindow: BrowserWindow | null = null

// Cache for performance
let lastKnownDisplay: Electron.Display | null = null
let lastBounds: Electron.Rectangle | null = null
let lastCursorPos = { x: 0, y: 0 }

// Add system requirements check
const MIN_REQUIREMENTS = {
  CPU: {
    cores: 2,
    speed: 1.6
  },
  RAM: 2,
  OS: {
    windows: '10',
    macos: '10.13',
    linux: 'Ubuntu 18.04'
  }
}

// Add performance monitoring
let performanceMetrics = {
  lastFrameTime: 0,
  frameCount: 0,
  averageFrameTime: 0,
  lastCheckTime: Date.now()
}

// Add error handling wrapper
function withErrorHandling<T>(fn: () => T, errorMessage: string): T {
  try {
    return fn()
  } catch (error) {
    console.error(`${errorMessage}:`, error)
    throw error
  }
}

// Add resource cleanup
function cleanupResources() {
  if (mouseTrackingInterval) {
    clearInterval(mouseTrackingInterval)
    mouseTrackingInterval = null
  }
  if (mainWindow) {
    mainWindow.destroy()
    mainWindow = null
  }
}

// Add performance monitoring
function monitorPerformance() {
  const now = Date.now()
  const frameTime = now - performanceMetrics.lastFrameTime
  performanceMetrics.frameCount++
  performanceMetrics.averageFrameTime = 
    (performanceMetrics.averageFrameTime * (performanceMetrics.frameCount - 1) + frameTime) / 
    performanceMetrics.frameCount

  if (now - performanceMetrics.lastCheckTime > 5000) {
    if (performanceMetrics.averageFrameTime > 32) {
      console.warn('Performance warning: Frame time above threshold')
    }
    performanceMetrics.lastCheckTime = now
    performanceMetrics.frameCount = 0
    performanceMetrics.averageFrameTime = 0
  }
  performanceMetrics.lastFrameTime = now
}

// Add GPU acceleration helper
function setupGPUAcceleration(window: BrowserWindow): void {
  if (ANIMATION.GPU.ENABLED) {
    window.setBackgroundColor('#1a1a1a')
    window.setOpacity(1)
    window.setBackgroundColor('#00000000')
  }
}

// Optimize animation frame scheduler
function scheduleAnimationFrame(callback: () => void): void {
  if (ANIMATION.GPU.ENABLED && typeof window !== 'undefined' && window.requestAnimationFrame) {
    window.requestAnimationFrame(() => {
      monitorPerformance()
      callback()
    })
  } else {
    const interval = Math.max(
      ANIMATION.INTERVAL,
      Math.min(1000 / ANIMATION.GPU.MIN_FPS, 1000 / ANIMATION.GPU.MAX_FPS)
    )
    setTimeout(() => {
      monitorPerformance()
      callback()
    }, interval)
  }
}

// Helper function to get current display with caching
function getCurrentDisplay(bounds: Electron.Rectangle): Electron.Display {
  if (lastBounds && 
      lastKnownDisplay && 
      lastBounds.x === bounds.x && 
      lastBounds.y === bounds.y) {
    return lastKnownDisplay
  }

  const displays = screen.getAllDisplays()
  const windowCenterX = bounds.x + bounds.width / 2
  const windowCenterY = bounds.y + bounds.height / 2

  const display = displays.find(display => {
    const { x, y, width, height } = display.bounds
    return (
      windowCenterX >= x &&
      windowCenterX <= x + width &&
      windowCenterY >= y &&
      windowCenterY <= y + height
    )
  }) || displays[0]

  lastBounds = { ...bounds }
  lastKnownDisplay = display

  return display
}

// Optimized easing function
const pinchEase = (t: number): number => {
  if (t < 0.5) return 4 * t * t * t
  return 1 - Math.pow(-2 * t + 2, 3) / 2
}

// Modify animateWindow function to handle opacity transitions separately
function animateWindow(
  window: BrowserWindow,
  startBounds: Electron.Rectangle,
  targetBounds: Electron.Rectangle,
  startTime: number,
  onComplete: () => void,
  isExpanding: boolean
): void {
  if (!window) return

  let opacityStartTime = startTime
  let currentOpacity = window.getOpacity()
  const targetOpacity = isExpanding ? ANIMATION.OPACITY.NORMAL : ANIMATION.OPACITY.PILL

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / ANIMATION.DURATION, 1)
    const easedProgress = pinchEase(progress)

    const newBounds = {
      x: Math.round(startBounds.x + (targetBounds.x - startBounds.x) * easedProgress),
      y: Math.round(startBounds.y + (targetBounds.y - startBounds.y) * easedProgress),
      width: Math.round(startBounds.width + (targetBounds.width - startBounds.width) * easedProgress),
      height: Math.round(startBounds.height + (targetBounds.height - startBounds.height) * easedProgress)
    }

    window.setBounds(newBounds)

    if (ANIMATION.GPU.ENABLED) {
      const opacityElapsed = Date.now() - opacityStartTime
      const opacityProgress = Math.min(opacityElapsed / ANIMATION.OPACITY.TRANSITION_DURATION, 1)
      const easedOpacityProgress = pinchEase(opacityProgress)
      
      const newOpacity = currentOpacity + (targetOpacity - currentOpacity) * easedOpacityProgress
      window.setOpacity(newOpacity)
    }

    if (progress < 1) {
      scheduleAnimationFrame(animate)
    } else {
      if (ANIMATION.GPU.ENABLED) {
        window.setOpacity(targetOpacity)
      }
      onComplete()
    }
  }

  scheduleAnimationFrame(animate)
}

// Modify trackMousePosition to handle hover state changes more smoothly
function trackMousePosition(window: BrowserWindow) {
  if (mouseTrackingInterval) {
    clearInterval(mouseTrackingInterval)
  }

  let lastHoverState = false
  let hoverStartTime = 0

  mouseTrackingInterval = setInterval(() => {
    if (!window || !isPill) {
      if (mouseTrackingInterval) {
        clearInterval(mouseTrackingInterval)
        mouseTrackingInterval = null
      }
      isHovered = false
      return
    }

    const cursorPos = screen.getCursorScreenPoint()
    
    if (lastCursorPos.x === cursorPos.x && lastCursorPos.y === cursorPos.y) {
      return
    }
    lastCursorPos = { ...cursorPos }

    const bounds = window.getBounds()

    const isInside = (
      cursorPos.x >= bounds.x &&
      cursorPos.x <= bounds.x + bounds.width &&
      cursorPos.y >= bounds.y &&
      cursorPos.y <= bounds.y + bounds.height
    )

    if (isInside && !isHovered && !isAnimating) {
      isHovered = true
      lastHoverState = true
      hoverStartTime = Date.now()
      window.webContents.send('hover-state-changed', true)
      
      if (isPill) {
        const startBounds = window.getBounds()
        const currentDisplay = getCurrentDisplay(startBounds)
        const { x: displayX, width: displayWidth } = currentDisplay.bounds
        
        // Check if there's enough space below for the hover view
        const bottomEdge = currentDisplay.workArea.y + currentDisplay.workArea.height
        const savedY = getSavedPillPositionY(currentDisplay)
        const spaceBelow = bottomEdge - savedY - ANIMATION.HOVER.HEIGHT
        
        // Get current pill height for calculating overlap
        const pillHeight = startBounds.height
        
        // Determine position based on available space
        let targetY
        if (spaceBelow < 0) {
          // Not enough space below, position above with optimal overlap
          // We position it so there's a 20px overlap between the pill and hover view
          const overlapAmount = 20 // Pixels of overlap for visual continuity
          
          targetY = Math.max(
            currentDisplay.workArea.y, // Don't go above the top of the screen
            savedY - ANIMATION.HOVER.HEIGHT + overlapAmount // Create overlap with pill
          )
          
          // Additional logging to debug positioning
          console.log('Opening hover above pill:', {
            pillY: savedY,
            hoverY: targetY,
            overlap: overlapAmount,
            pillHeight: pillHeight,
            hoverHeight: ANIMATION.HOVER.HEIGHT
          })
        } else {
          // Enough space below, use normal position
          targetY = savedY
          console.log('Opening hover below pill at Y:', targetY)
        }
        
        const targetBounds = {
          x: displayX + displayWidth - ANIMATION.HOVER.WIDTH - 15, // 15px margin from right edge
          y: targetY,
          width: ANIMATION.HOVER.WIDTH,
          height: ANIMATION.HOVER.HEIGHT
        }

        isAnimating = true
        
        animateWindow(window, startBounds, targetBounds, hoverStartTime, () => {
          isAnimating = false
        }, true)
      }
    } else if (!isInside && isHovered) {
      isHovered = false
      lastHoverState = false
      hoverStartTime = Date.now()
      window.webContents.send('hover-state-changed', false)
      
      if (isPill && !isAnimating) {
        const startBounds = window.getBounds()
        const currentDisplay = getCurrentDisplay(startBounds)
        const { x: displayX, width: displayWidth, y: displayY } = currentDisplay.bounds

        const targetBounds = {
          x: displayX + displayWidth - (ANIMATION.PILL.WIDTH * (1 - ANIMATION.PILL.HIDDEN_PERCENT)),
          y: getSavedPillPositionY(currentDisplay),
          width: ANIMATION.PILL.WIDTH,
          height: ANIMATION.PILL.HEIGHT
        }

        isAnimating = true
        
        animateWindow(window, startBounds, targetBounds, hoverStartTime, () => {
          isAnimating = false
        }, false)
      }
    }
  }, 32)
}

// Modify window creation with system checks
function createWindow(): void {
  const systemInfo = {
    cpu: process.getCPUUsage(),
    memory: process.getSystemMemoryInfo(),
    platform: process.platform,
    version: process.getSystemVersion()
  }

  if (is.dev) {
    console.log('System Info:', systemInfo)
  }

  const meetsRequirements = (
    systemInfo.memory.free / 1024 / 1024 >= MIN_REQUIREMENTS.RAM
  )

  if (!meetsRequirements) {
    console.warn('System does not meet minimum requirements')
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workArea

  const x = screenWidth - DEFAULT_WINDOW.width - DEFAULT_WINDOW.margin
  const y = screenHeight - DEFAULT_WINDOW.height

  mainWindow = new BrowserWindow({
    alwaysOnTop: true,
    width: DEFAULT_WINDOW.width,
    height: DEFAULT_WINDOW.height,
    minWidth: 0,
    minHeight: 0,
    x,
    y,
    frame: false,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#1a1a1a',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: true,
      backgroundThrottling: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: is.dev,
      offscreen: false,
      enableBlinkFeatures: 'CSSBackdropFilter',
      enableWebSQL: false,
      defaultFontFamily: {
        standard: 'Arial',
        serif: 'Times New Roman',
        sansSerif: 'Arial',
        monospace: 'Courier New'
      }
    }
  })

  if (!mainWindow) return

  setupGPUAcceleration(mainWindow)
  enable(mainWindow.webContents)

  mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: false
  })

  mainWindow.setIgnoreMouseEvents(false, { forward: true })

  mainWindow.on('ready-to-show', () => {
    withErrorHandling(() => {
      if (mainWindow) {
        mainWindow.show()
      }
    }, 'Error showing window')
  })

  mainWindow.on('closed', () => {
    cleanupResources()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Reset function to ensure window is in expanded state
function resetToExpandedView() {
  if (!mainWindow) return;
  
  // Force window to expanded state
  isPill = false;
  isHovered = false;
  
  // Stop any ongoing animations
  isAnimating = false;
  
  // Set window to expanded dimensions
  const currentDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { width: screenWidth, height: screenHeight } = currentDisplay.workArea;
  const x = screenWidth - DEFAULT_WINDOW.width - DEFAULT_WINDOW.margin + currentDisplay.bounds.x;
  const y = screenHeight - DEFAULT_WINDOW.height + currentDisplay.bounds.y;
  
  mainWindow.setBounds({
    width: DEFAULT_WINDOW.width,
    height: DEFAULT_WINDOW.height,
    x,
    y
  });
  
  // Ensure window is fully opaque
  mainWindow.setOpacity(1);
  
  // Notify renderer process
  mainWindow.webContents.send('window-state-changed', 'normal');
}

// Create window at initialization
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('get-window-state', () => {
    return isPill ? 'pill' : 'normal'
  })

  ipcMain.handle('resize-to-pill', () => {
    if (!mainWindow || isAnimating) return
    
    if (isPill) {
      const startBounds = mainWindow.getBounds()
      const startTime = Date.now()
      
      isAnimating = true
      
      const currentDisplay = getCurrentDisplay(startBounds)
      
      const { width: screenWidth, height: screenHeight } = currentDisplay.workArea
      const targetX = screenWidth - DEFAULT_WINDOW.width - DEFAULT_WINDOW.margin + currentDisplay.bounds.x
      const targetY = screenHeight - DEFAULT_WINDOW.height + currentDisplay.bounds.y
      
      const animate = () => {
        if (!mainWindow) {
          isAnimating = false
          return
        }
        
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / ANIMATION.DURATION, 1)
        const easedProgress = pinchEase(progress)
        
        const currentWidth = Math.round(
          startBounds.width + (DEFAULT_WINDOW.width - startBounds.width) * easedProgress
        )
        const currentHeight = Math.round(
          startBounds.height + (DEFAULT_WINDOW.height - startBounds.height) * easedProgress
        )
        
        const currentX = Math.round(
          startBounds.x + (targetX - startBounds.x) * easedProgress
        )
        const currentY = Math.round(
          startBounds.y + (targetY - startBounds.y) * easedProgress
        )
        
        mainWindow.setBounds({
          x: currentX,
          y: currentY,
          width: currentWidth,
          height: currentHeight
        })
        
        mainWindow.setOpacity(0.7 + 0.3 * easedProgress)
        
        if (progress < 1) {
          scheduleAnimationFrame(animate)
        } else {
          isPill = false
          isAnimating = false
          if (mouseTrackingInterval) {
            clearInterval(mouseTrackingInterval)
            mouseTrackingInterval = null
          }
          mainWindow.webContents.send('window-state-changed', 'normal')
        }
      }
      
      scheduleAnimationFrame(animate)
    } else {
      const startBounds = mainWindow.getBounds()
      
      const currentDisplay = getCurrentDisplay(startBounds)
      const { x: displayX, width: displayWidth, y: displayY } = currentDisplay.bounds
      
      const finalX = displayX + displayWidth - (ANIMATION.PILL.WIDTH * (1 - ANIMATION.PILL.HIDDEN_PERCENT))
      const finalY = getSavedPillPositionY(currentDisplay)
      
      const startTime = Date.now()
      
      isAnimating = true
      
      const animate = () => {
        if (!mainWindow) {
          isAnimating = false
          return
        }
        
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / ANIMATION.DURATION, 1)
        const easedProgress = pinchEase(progress)
        
        const currentWidth = Math.round(
          startBounds.width + (ANIMATION.PILL.WIDTH - startBounds.width) * easedProgress
        )
        const currentHeight = Math.round(
          startBounds.height + (ANIMATION.PILL.HEIGHT - startBounds.height) * easedProgress
        )
        
        const currentX = Math.round(
          startBounds.x + (finalX - startBounds.x) * easedProgress
        )
        const currentY = Math.round(
          startBounds.y + (finalY - startBounds.y) * easedProgress
        )
        
        mainWindow.setBounds({
          x: currentX,
          y: currentY,
          width: currentWidth,
          height: currentHeight
        })
        
        mainWindow.setOpacity(1 - 0.3 * easedProgress)
        
        if (progress < 1) {
          scheduleAnimationFrame(animate)
        } else {
          isPill = true
          isAnimating = false
          mainWindow.focus()
          trackMousePosition(mainWindow)
          mainWindow.webContents.send('window-state-changed', 'pill')
        }
      }
      
      scheduleAnimationFrame(animate)
    }
  })

  ipcMain.handle('restore-window', () => {
    if (!mainWindow || !isPill || isAnimating) return
    
    isAnimating = true
    
    mainWindow.focus()
    mainWindow.setIgnoreMouseEvents(false, { forward: true })
    
    const startBounds = mainWindow.getBounds()
    const startTime = Date.now()

    const currentDisplay = getCurrentDisplay(startBounds)
    const { width: screenWidth, height: screenHeight } = currentDisplay.workArea
    const targetX = screenWidth - DEFAULT_WINDOW.width - DEFAULT_WINDOW.margin + currentDisplay.bounds.x
    const targetY = screenHeight - DEFAULT_WINDOW.height + currentDisplay.bounds.y
    
    const animate = () => {
      if (!mainWindow) {
        isAnimating = false
        return
      }
      
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / ANIMATION.DURATION, 1)
      const easedProgress = pinchEase(progress)
      
      const currentWidth = Math.round(
        startBounds.width + (DEFAULT_WINDOW.width - startBounds.width) * easedProgress
      )
      const currentHeight = Math.round(
        startBounds.height + (DEFAULT_WINDOW.height - startBounds.height) * easedProgress
      )
      
      const currentX = Math.round(
        startBounds.x + (targetX - startBounds.x) * easedProgress
      )
      const currentY = Math.round(
        startBounds.y + (targetY - startBounds.y) * easedProgress
      )
      
      mainWindow.setBounds({
        x: currentX,
        y: currentY,
        width: currentWidth,
        height: currentHeight
      })
      
      mainWindow.setOpacity(0.7 + 0.3 * easedProgress)
      
      if (progress < 1) {
        scheduleAnimationFrame(animate)
      } else {
        if (mouseTrackingInterval) {
          clearInterval(mouseTrackingInterval)
          mouseTrackingInterval = null
        }
        isPill = false
        isAnimating = false
        mainWindow.webContents.send('window-state-changed', 'normal')
      }
    }
    
    scheduleAnimationFrame(animate)
  })

  // Create the main window
  createWindow()
  
  // Always ensure window starts in expanded view
  if (mainWindow) {
    resetToExpandedView()
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      if (mainWindow) {
        resetToExpandedView()
      }
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Add cleanup on app quit
app.on('before-quit', () => {
  cleanupResources()
})

// Reset to expanded view when system wakes up
powerMonitor.on('resume', () => {
  if (mainWindow) {
    resetToExpandedView()
  }
})

// Handle window visibility changes
ipcMain.on('window-visibility-change', (_, isVisible) => {
  if (isVisible && mainWindow) {
    resetToExpandedView()
  }
})

// Add handler for window dragging from the green handle
ipcMain.on('window-drag', (_, deltaX, deltaY) => {
  if (!mainWindow) return;
  
  // Get current window position
  const currentBounds = mainWindow.getBounds();
  
  // Get current display
  const currentDisplay = screen.getDisplayNearestPoint({
    x: currentBounds.x,
    y: currentBounds.y
  });
  
  // Calculate right edge X position (fixed)
  const rightEdgeX = currentDisplay.workArea.x + currentDisplay.workArea.width - currentBounds.width;
  
  // Calculate new Y position with deltaY
  let newY = currentBounds.y + deltaY;
  
  // Constrain to keep window at least 40px from bottom of screen
  const bottomEdge = currentDisplay.workArea.y + currentDisplay.workArea.height;
  const minMargin = -100; // Minimum margin from bottom edge in pixels
  
  // Enforce minimum distance from bottom
  if (newY + currentBounds.height > bottomEdge - minMargin) {
    newY = bottomEdge - currentBounds.height - minMargin;
  }
  
  // Set new position - X is fixed to right edge, Y is constrained
  mainWindow.setBounds({
    x: rightEdgeX, // Keep X fixed at right edge
    y: newY, // Y is constrained to maintain bottom margin
    width: currentBounds.width,
    height: currentBounds.height
  });
});

// Add handler to save current position as pill position
ipcMain.on('save-pill-position', () => {
  if (!mainWindow) return;
  
  // Get current window position
  const currentBounds = mainWindow.getBounds();
  
  // Get current display
  const currentDisplay = screen.getDisplayNearestPoint({
    x: currentBounds.x,
    y: currentBounds.y
  });
  
  // Calculate Y position with bottom constraint
  let savedY = currentBounds.y;
  
  // Ensure position respects minimum margin from bottom
  const bottomEdge = currentDisplay.workArea.y + currentDisplay.workArea.height;
  const minMargin = -100; // Minimum margin from bottom edge in pixels
  
  // Enforce minimum distance from bottom
  if (savedY + currentBounds.height > bottomEdge - minMargin) {
    savedY = bottomEdge - currentBounds.height - minMargin;
  }
  
  // Store just the Y coordinate for pill mode
  // We'll always position on the right side horizontally
  const customPillPosition = {
    enabled: true,
    y: savedY
  };
  
  // Log for debugging
  console.log('Saved pill position Y:', customPillPosition.y);
  
  // Store for use when switching view modes
  global.customPillPosition = customPillPosition;
});

// Add a function to get the saved pill position Y coordinate
function getSavedPillPositionY(currentDisplay: Electron.Display): number {
  // Base position - either custom or default
  let yPosition;
  
  // Check if we have a custom position saved
  if (global.customPillPosition && global.customPillPosition.enabled) {
    yPosition = global.customPillPosition.y;
  } else {
    // Default position if no custom position is saved
    yPosition = currentDisplay.bounds.y + ANIMATION.PILL.TOP_MARGIN;
  }
  
  // Get window height based on mode
  let windowHeight = isPill ? ANIMATION.PILL.HEIGHT : ANIMATION.HOVER.HEIGHT;
  
  // Ensure position respects minimum margin from bottom
  const bottomEdge = currentDisplay.workArea.y + currentDisplay.workArea.height;
  const minMargin = -100; // Minimum margin from bottom edge in pixels
  
  // Enforce minimum distance from bottom
  if (yPosition + windowHeight > bottomEdge - minMargin) {
    yPosition = bottomEdge - windowHeight - minMargin;
  }
  
  return yPosition;
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
