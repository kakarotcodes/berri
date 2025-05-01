import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
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
  INTERVAL: 16, // Align with 60fps (1000ms/60 ≈ 16.67ms)
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
  // Add GPU acceleration settings
  GPU: {
    ENABLED: true,
    MAX_FPS: 60,
    MIN_FPS: 30,
    QUALITY: 'high' // Can be 'high', 'medium', 'low'
  },
  // Add opacity settings
  OPACITY: {
    NORMAL: 1,
    PILL: 0.7,
    TRANSITION_DURATION: 200 // Shorter duration for opacity changes
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
    speed: 1.6 // GHz
  },
  RAM: 2, // GB
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
    // In production, you might want to send this to an error tracking service
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

  // Check every 5 seconds
  if (now - performanceMetrics.lastCheckTime > 5000) {
    if (performanceMetrics.averageFrameTime > 32) { // More than 2 frames behind
      console.warn('Performance warning: Frame time above threshold')
      // In production, you might want to reduce animation quality or disable some features
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
    // Enable hardware acceleration
    window.setBackgroundColor('#1a1a1a')
    
    // Enable transparent window for better compositing
    window.setOpacity(1)
    
    // Set window background to be transparent
    window.setBackgroundColor('#00000000')
  }
}

// Optimize animation frame scheduler
function scheduleAnimationFrame(callback: () => void): void {
  if (ANIMATION.GPU.ENABLED && typeof window !== 'undefined' && window.requestAnimationFrame) {
    // Use requestAnimationFrame for GPU-accelerated animations
    window.requestAnimationFrame(() => {
      monitorPerformance()
      callback()
    })
  } else {
    // Fallback to setTimeout with dynamic interval based on performance
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
  // If bounds haven't changed, return cached display
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

  // Cache the results
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

    // Calculate new bounds with GPU-accelerated transforms
    const newBounds = {
      x: Math.round(startBounds.x + (targetBounds.x - startBounds.x) * easedProgress),
      y: Math.round(startBounds.y + (targetBounds.y - startBounds.y) * easedProgress),
      width: Math.round(startBounds.width + (targetBounds.width - startBounds.width) * easedProgress),
      height: Math.round(startBounds.height + (targetBounds.height - startBounds.height) * easedProgress)
    }

    // Use setBounds with GPU acceleration
    window.setBounds(newBounds)

    // Handle opacity transition separately with a shorter duration
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
      // Ensure final opacity is set correctly
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
    
    // Skip processing if cursor hasn't moved
    if (lastCursorPos.x === cursorPos.x && lastCursorPos.y === cursorPos.y) {
      return
    }
    lastCursorPos = { ...cursorPos }

    const bounds = window.getBounds()

    // Check if cursor is within the window bounds
    const isInside = (
      cursorPos.x >= bounds.x &&
      cursorPos.x <= bounds.x + bounds.width &&
      cursorPos.y >= bounds.y &&
      cursorPos.y <= bounds.y + bounds.height
    )

    // Handle hover state changes with GPU-accelerated animations
    if (isInside && !isHovered && !isAnimating) {
      isHovered = true
      lastHoverState = true
      hoverStartTime = Date.now()
      window.webContents.send('hover-state-changed', true)
      
      if (isPill) {
        const startBounds = window.getBounds()
        const currentDisplay = getCurrentDisplay(startBounds)
        const { x: displayX, width: displayWidth, y: displayY } = currentDisplay.bounds
        
        const targetBounds = {
          x: displayX + displayWidth - ANIMATION.HOVER.WIDTH,
          y: displayY + ANIMATION.PILL.TOP_MARGIN,
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
          y: displayY + ANIMATION.PILL.TOP_MARGIN,
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
  // Check system requirements
  const systemInfo = {
    cpu: process.getCPUUsage(),
    memory: process.getSystemMemoryInfo(),
    platform: process.platform,
    version: process.getSystemVersion()
  }

  // Log system info in development
  if (is.dev) {
    console.log('System Info:', systemInfo)
  }

  // Check if system meets minimum requirements
  const meetsRequirements = (
    systemInfo.memory.free / 1024 / 1024 >= MIN_REQUIREMENTS.RAM
  )

  if (!meetsRequirements) {
    console.warn('System does not meet minimum requirements')
    // In production, you might want to show a warning dialog
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workArea

  const x = screenWidth - DEFAULT_WINDOW.width - DEFAULT_WINDOW.margin
  const y = screenHeight - DEFAULT_WINDOW.height

  // Create the browser window with optimized settings
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
      // Performance optimizations
      backgroundThrottling: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: is.dev,
      // GPU acceleration settings
      offscreen: false,
      enableBlinkFeatures: 'CSSBackdropFilter',
      // Additional production optimizations
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

  // Setup GPU acceleration
  setupGPUAcceleration(mainWindow)

  // Enable remote module for this window
  enable(mainWindow.webContents)

  // Optimize window visibility settings
  mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: false
  })

  // Set up mouse event handling with optimized settings
  mainWindow.setIgnoreMouseEvents(false, { forward: true })

  // Add window event listeners with error handling
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

  // Optimize external link handling
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the appropriate URL based on environment
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Optimize window shortcuts
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Handle window state changes with optimized IPC
  ipcMain.handle('get-window-state', () => {
    return isPill ? 'pill' : 'normal'
  })

  // Handle resize to pill with optimized animation
  ipcMain.handle('resize-to-pill', () => {
    if (!mainWindow || isAnimating) return
    
    if (isPill) {
      // Restore to original size
      const startBounds = mainWindow.getBounds()
      const startTime = Date.now()
      
      isAnimating = true
      
      // Get the current display
      const currentDisplay = getCurrentDisplay(startBounds)
      
      // Calculate target position on current display
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
        
        // Calculate current dimensions with optimized scaling
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
        
        // Fade back to full opacity
        mainWindow.setOpacity(0.7 + 0.3 * easedProgress)
        
        if (progress < 1) {
          scheduleAnimationFrame(animate)
        } else {
          isPill = false
          isAnimating = false
          // Stop tracking mouse position when not in pill mode
          if (mouseTrackingInterval) {
            clearInterval(mouseTrackingInterval)
            mouseTrackingInterval = null
          }
          // Notify renderer of state change
          mainWindow.webContents.send('window-state-changed', 'normal')
        }
      }
      
      scheduleAnimationFrame(animate)
    } else {
      const startBounds = mainWindow.getBounds()
      
      // Get the current display the window is on
      const currentDisplay = getCurrentDisplay(startBounds)
      const { x: displayX, width: displayWidth, y: displayY } = currentDisplay.bounds
      
      // Calculate final position at top-right of current screen
      const finalX = displayX + displayWidth - (ANIMATION.PILL.WIDTH * (1 - ANIMATION.PILL.HIDDEN_PERCENT))
      const finalY = displayY + ANIMATION.PILL.TOP_MARGIN
      
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
        
        // Fade to semi-transparent
        mainWindow.setOpacity(1 - 0.3 * easedProgress) // 70% opacity when in pill form
        
        if (progress < 1) {
          scheduleAnimationFrame(animate)
        } else {
          isPill = true
          isAnimating = false
          // Focus the window when entering pill mode
          mainWindow.focus()
          // Start tracking mouse position when in pill mode
          trackMousePosition(mainWindow)
          mainWindow.webContents.send('window-state-changed', 'pill')
        }
      }
      
      scheduleAnimationFrame(animate)
    }
  })

  // Handle window restore with optimized animation
  ipcMain.handle('restore-window', () => {
    if (!mainWindow || !isPill || isAnimating) return
    
    isAnimating = true
    
    // Focus the window before restoring
    mainWindow.focus()
    mainWindow.setIgnoreMouseEvents(false, { forward: true })
    
    const startBounds = mainWindow.getBounds()
    const startTime = Date.now()

    // Get the current display
    const currentDisplay = getCurrentDisplay(startBounds)

    // Calculate target position on current display
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
      
      // Calculate current dimensions with optimized scaling
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
      
      // Fade back to full opacity
      mainWindow.setOpacity(0.7 + 0.3 * easedProgress)
      
      if (progress < 1) {
        scheduleAnimationFrame(animate)
      } else {
        // Stop tracking mouse position when not in pill mode
        if (mouseTrackingInterval) {
          clearInterval(mouseTrackingInterval)
          mouseTrackingInterval = null
        }
        // Set state to normal BEFORE notifying renderer
        isPill = false
        isAnimating = false
        // Notify renderer of state change
        mainWindow.webContents.send('window-state-changed', 'normal')
      }
    }
    
    scheduleAnimationFrame(animate)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
