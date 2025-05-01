import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initialize, enable } from '@electron/remote/main'

// Initialize remote module
initialize()

// Track window state
let isPill = false
let mouseTrackingInterval: NodeJS.Timeout | null = null
let isHovered = false

// Store original bounds
let originalBounds: Electron.Rectangle | null = null
let mainWindow: BrowserWindow | null = null

// Track animation state
let isAnimating = false

// Store default window size and position
const DEFAULT_WINDOW = {
  width: 512,
  height: 288,
  margin: 30
}

function trackMousePosition(window: BrowserWindow) {
  if (mouseTrackingInterval) {
    clearInterval(mouseTrackingInterval)
  }

  mouseTrackingInterval = setInterval(() => {
    if (!window || !isPill) {
      if (mouseTrackingInterval) {
        clearInterval(mouseTrackingInterval)
        mouseTrackingInterval = null
      }
      return
    }

    const cursorPos = screen.getCursorScreenPoint()
    const bounds = window.getBounds()

    // Check if cursor is within the window bounds
    const isInside = (
      cursorPos.x >= bounds.x &&
      cursorPos.x <= bounds.x + bounds.width &&
      cursorPos.y >= bounds.y &&
      cursorPos.y <= bounds.y + bounds.height
    )

    // Handle hover state changes
    if (isInside && !isHovered) {
      isHovered = true
      window.webContents.send('hover-state-changed', true)
      // Expand the pill
      if (isPill && !isAnimating) {
        const startBounds = window.getBounds()
        const startTime = Date.now()
        const duration = 350
        const interval = 8

        // Get the current display the window is on
        const displays = screen.getAllDisplays()
        const currentDisplay = displays.find(display => {
          const { x, y, width, height } = display.bounds
          const windowCenterX = startBounds.x + startBounds.width / 2
          const windowCenterY = startBounds.y + startBounds.height / 2
          return (
            windowCenterX >= x &&
            windowCenterX <= x + width &&
            windowCenterY >= y &&
            windowCenterY <= y + height
          )
        }) || displays[0]
        
        const { x: displayX, width: displayWidth, y: displayY } = currentDisplay.bounds
        
        // Calculate new position at top-right of current screen
        const targetWidth = 240 // Standard expanded width
        const targetHeight = 240 // Standard expanded height
        const newX = displayX + displayWidth - targetWidth
        const newY = displayY + 150 // 150px from top of the screen

        isAnimating = true
        
        const animate = () => {
          if (!window || !isPill) {
            isAnimating = false
            return
          }
          
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          
          const pinchEase = (t: number) => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
          }
          
          const easedProgress = pinchEase(progress)
          
          const newWidth = Math.round(startBounds.width + (targetWidth - startBounds.width) * easedProgress)
          const newHeight = Math.round(startBounds.height + (targetHeight - startBounds.height) * easedProgress)
          
          const currentX = Math.round(startBounds.x + (newX - startBounds.x) * easedProgress)
          const currentY = Math.round(startBounds.y + (newY - startBounds.y) * easedProgress)
          
          window.setBounds({
            x: currentX,
            y: currentY,
            width: newWidth,
            height: newHeight
          })
          
          if (progress < 1) {
            setTimeout(animate, interval)
          } else {
            isAnimating = false
          }
        }
        
        animate()
      }
    } else if (!isInside && isHovered) {
      isHovered = false
      window.webContents.send('hover-state-changed', false)
      // Collapse the pill
      if (isPill && !isAnimating) {
        const startBounds = window.getBounds()
        const startTime = Date.now()
        const duration = 350
        const interval = 8

        // Get the current display the window is on
        const displays = screen.getAllDisplays()
        const currentDisplay = displays.find(display => {
          const { x, y, width, height } = display.bounds
          const windowCenterX = startBounds.x + startBounds.width / 2
          const windowCenterY = startBounds.y + startBounds.height / 2
          return (
            windowCenterX >= x &&
            windowCenterX <= x + width &&
            windowCenterY >= y &&
            windowCenterY <= y + height
          )
        }) || displays[0]

        const { x: displayX, width: displayWidth, y: displayY } = currentDisplay.bounds

        const targetWidth = 100 // Standard pill width
        const targetHeight = 40 // Standard pill height
        
        // Calculate final position at top-right of current screen
        const hiddenPercentage = 0.4 // 40% hidden
        const finalX = displayX + displayWidth - (targetWidth * (1 - hiddenPercentage))
        const finalY = displayY + 150 // 150px from top of the screen

        isAnimating = true
        
        const animate = () => {
          if (!window || !isPill) {
            isAnimating = false
            return
          }
          
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          
          const pinchEase = (t: number) => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
          }
          
          const easedProgress = pinchEase(progress)
          
          const newWidth = Math.round(startBounds.width + (targetWidth - startBounds.width) * easedProgress)
          const newHeight = Math.round(startBounds.height + (targetHeight - startBounds.height) * easedProgress)
          
          const currentX = Math.round(startBounds.x + (finalX - startBounds.x) * easedProgress)
          const currentY = Math.round(startBounds.y + (finalY - startBounds.y) * easedProgress)
          
          window.setBounds({
            x: currentX,
            y: currentY,
            width: newWidth,
            height: newHeight
          })
          
          if (progress < 1) {
            setTimeout(animate, interval)
          } else {
            isAnimating = false
          }
        }
        
        animate()
      }
    }
  }, 50) // Poll every 50ms
}

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workArea

  const x = screenWidth - DEFAULT_WINDOW.width - DEFAULT_WINDOW.margin
  const y = screenHeight - DEFAULT_WINDOW.height

  // Create the browser window.
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
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: true
    }
  })

  if (!mainWindow) return

  // Enable remote module for this window
  enable(mainWindow.webContents)

  mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: false
  })

  // Set up mouse event handling
  mainWindow.setIgnoreMouseEvents(false, { forward: true })

  // Store initial window bounds
  originalBounds = {
    width: DEFAULT_WINDOW.width,
    height: DEFAULT_WINDOW.height,
    x,
    y
  }

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Handle window focus
  mainWindow.on('focus', () => {
    if (mainWindow && isPill) {
      mainWindow.webContents.send('window-state-changed', 'pill')
    }
  })

  mainWindow.on('blur', () => {
    if (mainWindow && isPill) {
      mainWindow.webContents.send('window-state-changed', 'pill')
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Handle window state changes
  ipcMain.handle('get-window-state', () => {
    return isPill ? 'pill' : 'normal'
  })

  // Handle resize to pill
  ipcMain.handle('resize-to-pill', () => {
    if (!mainWindow || isAnimating) return
    
    if (isPill) {
      // Restore to original size
      if (originalBounds) {
        const startBounds = mainWindow.getBounds()
        const startTime = Date.now()
        const duration = 350
        const interval = 8
        
        isAnimating = true
        
        const animate = () => {
          if (!mainWindow || !originalBounds) {
            isAnimating = false
            return
          }
          
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          
          const pinchEase = (t: number) => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
          }
          const easedProgress = pinchEase(progress)
          
          // Calculate current dimensions with optimized scaling
          const currentWidth = Math.round(
            startBounds.width + (originalBounds.width - startBounds.width) * easedProgress
          )
          const currentHeight = Math.round(
            startBounds.height + (originalBounds.height - startBounds.height) * easedProgress
          )
          
          // Calculate position with center scaling
          const centerX = startBounds.x + startBounds.width / 2
          const centerY = startBounds.y + startBounds.height / 2
          const targetCenterX = originalBounds.x + originalBounds.width / 2
          const targetCenterY = originalBounds.y + originalBounds.height / 2
          
          const currentX = Math.round(
            centerX - currentWidth / 2 + (targetCenterX - centerX) * easedProgress
          )
          const currentY = Math.round(
            centerY - currentHeight / 2 + (targetCenterY - centerY) * easedProgress
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
            setTimeout(animate, interval)
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
        
        animate()
      }
    } else {
      // Store original bounds before going to pill mode
      originalBounds = mainWindow.getBounds()
      
      const startBounds = mainWindow.getBounds()
      const targetWidth = 100 // Standard pill width
      const targetHeight = 40 // Standard pill height
      
      // Get the current display the window is on
      const displays = screen.getAllDisplays()
      const currentDisplay = displays.find(display => {
        const { x, y, width, height } = display.bounds
        const windowCenterX = startBounds.x + startBounds.width / 2
        const windowCenterY = startBounds.y + startBounds.height / 2
        return (
          windowCenterX >= x &&
          windowCenterX <= x + width &&
          windowCenterY >= y &&
          windowCenterY <= y + height
        )
      }) || displays[0]
      
      const { x: displayX, width: displayWidth, y: displayY } = currentDisplay.bounds
      
      // Calculate final position at top-right of current screen
      const hiddenPercentage = 0.4 // 40% hidden
      const finalX = displayX + displayWidth - (targetWidth * (1 - hiddenPercentage))
      const finalY = displayY + 150 // 150px from top of the screen
      
      const startTime = Date.now()
      const duration = 350
      const interval = 8
      
      isAnimating = true
      
      const animate = () => {
        if (!mainWindow) {
          isAnimating = false
          return
        }
        
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        const pinchEase = (t: number) => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        }
        const easedProgress = pinchEase(progress)
        
        const currentWidth = Math.round(
          startBounds.width + (targetWidth - startBounds.width) * easedProgress
        )
        const currentHeight = Math.round(
          startBounds.height + (targetHeight - startBounds.height) * easedProgress
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
          setTimeout(animate, interval)
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
      
      animate()
    }
  })

  // Handle window restore
  ipcMain.handle('restore-window', () => {
    if (!mainWindow || !isPill || isAnimating) return
    
    isAnimating = true
    
    // Focus the window before restoring
    mainWindow.focus()
    mainWindow.setIgnoreMouseEvents(false, { forward: true })
    
    const startBounds = mainWindow.getBounds()
    const startTime = Date.now()
    const duration = 350
    const interval = 8

    // Get the current display
    const displays = screen.getAllDisplays()
    const currentDisplay = displays.find(display => {
      const { x, y, width, height } = display.bounds
      const windowCenterX = startBounds.x + startBounds.width / 2
      const windowCenterY = startBounds.y + startBounds.height / 2
      return (
        windowCenterX >= x &&
        windowCenterX <= x + width &&
        windowCenterY >= y &&
        windowCenterY <= y + height
      )
    }) || displays[0]

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
      const progress = Math.min(elapsed / duration, 1)
      
      const pinchEase = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      }
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
        setTimeout(animate, interval)
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
    
    animate()
  })

  // Handle pill expansion
  ipcMain.handle('expand-pill', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win && isPill) {
      const startBounds = win.getBounds()
      const startTime = Date.now()
      const duration = 350
      const interval = 8

      // Get the current display the window is on
      const displays = screen.getAllDisplays()
      const currentDisplay = displays.find(display => {
        const { x, y, width, height } = display.bounds
        const windowCenterX = startBounds.x + startBounds.width / 2
        const windowCenterY = startBounds.y + startBounds.height / 2
        return (
          windowCenterX >= x &&
          windowCenterX <= x + width &&
          windowCenterY >= y &&
          windowCenterY <= y + height
        )
      }) || displays[0]
      
      const { x: displayX, width: displayWidth, y: displayY } = currentDisplay.bounds
      
      // Calculate new position at top-right of current screen
      const targetWidth = 240 // Standard expanded width
      const targetHeight = 240 // Standard expanded height
      const newX = displayX + displayWidth - targetWidth
      const newY = displayY + 150 // 150px from top of the screen

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        const pinchEase = (t: number) => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        }
        
        const easedProgress = pinchEase(progress)
        
        const newWidth = Math.round(startBounds.width + (targetWidth - startBounds.width) * easedProgress)
        const newHeight = Math.round(startBounds.height + (targetHeight - startBounds.height) * easedProgress)
        
        const currentX = Math.round(startBounds.x + (newX - startBounds.x) * easedProgress)
        const currentY = Math.round(startBounds.y + (newY - startBounds.y) * easedProgress)
        
        win.setBounds({
          x: currentX,
          y: currentY,
          width: newWidth,
          height: newHeight
        })
        
        if (progress < 1) {
          setTimeout(animate, interval)
        }
      }
      
      animate()
    }
  })

  // Handle pill collapse
  ipcMain.handle('collapse-pill', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win && isPill) {
      const startBounds = win.getBounds()
      const startTime = Date.now()
      const duration = 350
      const interval = 8

      // Get the current display the window is on
      const displays = screen.getAllDisplays()
      const currentDisplay = displays.find(display => {
        const { x, y, width, height } = display.bounds
        const windowCenterX = startBounds.x + startBounds.width / 2
        const windowCenterY = startBounds.y + startBounds.height / 2
        return (
          windowCenterX >= x &&
          windowCenterX <= x + width &&
          windowCenterY >= y &&
          windowCenterY <= y + height
        )
      }) || displays[0] // Fallback to primary display if not found

      const { x: displayX, width: displayWidth, y: displayY } = currentDisplay.bounds

      const targetWidth = 100 // Standard pill width
      const targetHeight = 40 // Standard pill height
      
      // Calculate final position at top-right of current screen
      const hiddenPercentage = 0.4 // 40% hidden
      const finalX = displayX + displayWidth - (targetWidth * (1 - hiddenPercentage))
      const finalY = displayY + 150 // 150px from top of the screen

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        const pinchEase = (t: number) => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        }
        
        const easedProgress = pinchEase(progress)
        
        const newWidth = Math.round(startBounds.width + (targetWidth - startBounds.width) * easedProgress)
        const newHeight = Math.round(startBounds.height + (targetHeight - startBounds.height) * easedProgress)
        
        const currentX = Math.round(startBounds.x + (finalX - startBounds.x) * easedProgress)
        const currentY = Math.round(startBounds.y + (finalY - startBounds.y) * easedProgress)
        
        win.setBounds({
          x: currentX,
          y: currentY,
          width: newWidth,
          height: newHeight
        })
        
        if (progress < 1) {
          setTimeout(animate, interval)
        }
      }
      
      animate()
    }
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
