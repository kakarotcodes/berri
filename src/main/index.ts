import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initialize, enable } from '@electron/remote/main'

// Initialize remote module
initialize()

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
    visibleOnFullScreen: true, // keep showing when another app goes FS
    skipTransformProcessType: false
  })

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
  let isPill = false
  
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
              return t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2
            }
            const easedProgress = pinchEase(progress)
            
            // Calculate current dimensions with optimized scaling
            const currentWidth = Math.round(startBounds.width + (originalBounds!.width - startBounds.width) * easedProgress)
            const currentHeight = Math.round(startBounds.height + (originalBounds!.height - startBounds.height) * easedProgress)
            
            // Calculate position with center scaling
            const centerX = startBounds.x + startBounds.width / 2
            const centerY = startBounds.y + startBounds.height / 2
            const targetCenterX = originalBounds!.x + originalBounds!.width / 2
            const targetCenterY = originalBounds!.y + originalBounds!.height / 2
            
            const currentX = Math.round(centerX - (currentWidth / 2) + (targetCenterX - centerX) * easedProgress)
            const currentY = Math.round(centerY - (currentHeight / 2) + (targetCenterY - centerY) * easedProgress)
            
            win.setBounds({
              x: currentX,
              y: currentY,
              width: currentWidth,
              height: currentHeight
            })
            
            // Fade back to full opacity
            win.setOpacity(0.7 + (0.3 * easedProgress))
            
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
        const targetWidth = 150 // Wider for pill shape
        const targetHeight = 40 // Shorter height for pill shape
        
        // Get screen dimensions
        const { width: screenWidth } = screen.getPrimaryDisplay().workArea
        
        // Calculate final position (40% out of screen)
        const hiddenPercentage = 0.4 // 40% hidden
        const finalX = screenWidth - (targetWidth * (1 - hiddenPercentage))
        const finalY = 20 // Slight padding from top
        
        const startTime = Date.now()
        const duration = 350 // Optimized duration
        const interval = 8 // Higher frame rate
        
        // Pre-calculate center points
        const centerX = startBounds.x + startBounds.width / 2
        const centerY = startBounds.y + startBounds.height / 2
        
        // Set initial transparency
        win.setOpacity(1)
        
        const animate = () => {
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          
          // Optimized easing function for smoother motion
          const pinchEase = (t: number) => {
            // Custom cubic bezier-like curve
            return t < 0.5
              ? 4 * t * t * t
              : 1 - Math.pow(-2 * t + 2, 3) / 2
          }
          const easedProgress = pinchEase(progress)
          
          // Subtle scale effect with optimized timing
          const scale = 1 - (0.15 * Math.sin(progress * Math.PI * 1.5))
          
          // Calculate dimensions with optimized scaling
          const currentWidth = Math.round((startBounds.width + (targetWidth - startBounds.width) * easedProgress) * scale)
          const currentHeight = Math.round((startBounds.height + (targetHeight - startBounds.height) * easedProgress) * scale)
          
          // Calculate position with optimized center scaling
          const currentX = Math.round(centerX - (currentWidth / 2) + (finalX - centerX + targetWidth / 2) * easedProgress)
          const currentY = Math.round(centerY - (currentHeight / 2) + (finalY - centerY + targetHeight / 2) * easedProgress)
          
          // Set bounds with minimal calculations
          win.setBounds({
            x: currentX,
            y: currentY,
            width: currentWidth,
            height: currentHeight
          })

          // Fade to semi-transparent
          win.setOpacity(1 - (0.3 * easedProgress)) // 70% opacity when in pill form
          
          if (progress < 1) {
            setTimeout(animate, interval)
          } else {
            isPill = true
            // Notify renderer of state change
            win.webContents.send('window-state-changed', 'pill')
          }
        }
        
        animate()
      }
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
