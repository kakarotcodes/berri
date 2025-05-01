import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initialize, enable } from '@electron/remote/main'

// Initialize remote module
initialize()

// Track window state
let isPill = false

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workArea

  const windowWidth = 512
  const windowHeight = 288
  const margin = 30

  const x = screenWidth - windowWidth - margin
  const y = screenHeight - windowHeight

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    alwaysOnTop: true,
    width: windowWidth,
    height: windowHeight,
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

  // Enable remote module for this window
  enable(mainWindow.webContents)

  mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: false
  })

  // Set up mouse event handling
  mainWindow.setIgnoreMouseEvents(false, { forward: true })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Store original bounds
  let originalBounds: Electron.Rectangle | null = null

  // Handle window state changes
  ipcMain.handle('get-window-state', () => {
    return isPill ? 'pill' : 'normal'
  })

  ipcMain.handle('resize-to-pill', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (isPill) {
        // Restore to original size
        if (originalBounds) {
          const startBounds = win.getBounds()
          const startTime = Date.now()
          const duration = 350
          const interval = 8
          
          const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            
            const pinchEase = (t: number) => {
              return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
            }
            const easedProgress = pinchEase(progress)
            
            // Calculate current dimensions with optimized scaling
            const currentWidth = Math.round(
              startBounds.width + (originalBounds!.width - startBounds.width) * easedProgress
            )
            const currentHeight = Math.round(
              startBounds.height + (originalBounds!.height - startBounds.height) * easedProgress
            )
            
            // Calculate position with center scaling
            const centerX = startBounds.x + startBounds.width / 2
            const centerY = startBounds.y + startBounds.height / 2
            const targetCenterX = originalBounds!.x + originalBounds!.width / 2
            const targetCenterY = originalBounds!.y + originalBounds!.height / 2
            
            const currentX = Math.round(
              centerX - currentWidth / 2 + (targetCenterX - centerX) * easedProgress
            )
            const currentY = Math.round(
              centerY - currentHeight / 2 + (targetCenterY - centerY) * easedProgress
            )
            
            win.setBounds({
              x: currentX,
              y: currentY,
              width: currentWidth,
              height: currentHeight
            })
            
            // Fade back to full opacity
            win.setOpacity(0.7 + 0.3 * easedProgress)
            
            if (progress < 1) {
              setTimeout(animate, interval)
            } else {
              // Reset original bounds after animation
              originalBounds = null
              isPill = false
              // Notify renderer of state change
              win.webContents.send('window-state-changed', 'normal')
            }
          }
          
          animate()
        }
      } else {
        // Store original bounds if not already stored
        if (!originalBounds) {
          originalBounds = win.getBounds()
        }
        
        const startBounds = win.getBounds()
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
        }) || displays[0] // Fallback to primary display if not found
        
        const { x: displayX, width: displayWidth, y: displayY } = currentDisplay.bounds
        
        // Calculate final position at top-right of current screen
        const hiddenPercentage = 0.4 // 40% hidden
        const finalX = displayX + displayWidth - (targetWidth * (1 - hiddenPercentage))
        const finalY = displayY + 150 // 150px from top of the screen
        
        const startTime = Date.now()
        const duration = 350
        const interval = 8
        
        const animate = () => {
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
          
          win.setBounds({
            x: currentX,
            y: currentY,
            width: currentWidth,
            height: currentHeight
          })
          
          // Fade to semi-transparent
          win.setOpacity(1 - 0.3 * easedProgress) // 70% opacity when in pill form
          
          if (progress < 1) {
            setTimeout(animate, interval)
          } else {
            isPill = true
            win.webContents.send('window-state-changed', 'pill')
          }
        }
        
        animate()
      }
    }
  })

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
      }) || displays[0] // Fallback to primary display if not found
      
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

  ipcMain.handle('restore-window', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win && isPill && originalBounds) {
      const startBounds = win.getBounds()
      const startTime = Date.now()
      const duration = 350
      const interval = 8
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        const pinchEase = (t: number) => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        }
        const easedProgress = pinchEase(progress)
        
        // Calculate current dimensions with optimized scaling
        const currentWidth = Math.round(
          startBounds.width + (originalBounds!.width - startBounds.width) * easedProgress
        )
        const currentHeight = Math.round(
          startBounds.height + (originalBounds!.height - startBounds.height) * easedProgress
        )
        
        // Calculate position with center scaling
        const centerX = startBounds.x + startBounds.width / 2
        const centerY = startBounds.y + startBounds.height / 2
        const targetCenterX = originalBounds!.x + originalBounds!.width / 2
        const targetCenterY = originalBounds!.y + originalBounds!.height / 2
        
        const currentX = Math.round(
          centerX - currentWidth / 2 + (targetCenterX - centerX) * easedProgress
        )
        const currentY = Math.round(
          centerY - currentHeight / 2 + (targetCenterY - centerY) * easedProgress
        )
        
        win.setBounds({
          x: currentX,
          y: currentY,
          width: currentWidth,
          height: currentHeight
        })
        
        // Fade back to full opacity
        win.setOpacity(0.7 + 0.3 * easedProgress)
        
        if (progress < 1) {
          setTimeout(animate, interval)
        } else {
          // Reset original bounds after animation
          originalBounds = null
          isPill = false
          // Notify renderer of state change
          win.webContents.send('window-state-changed', 'normal')
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
