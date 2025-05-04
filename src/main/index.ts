import { app, shell, BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// Import view configurations
import { ViewConfig, getDefaultViewConfig } from '../views/defaultView'
import { getPillViewConfig } from '../views/pillView'
import { getHoverViewConfig } from '../views/hoverView'
import { getExpandedViewConfig } from '../views/expandedView'

// Import utilities
import { clampWindowToWorkArea, createDebouncedWindowClamper } from '../utils/windowBounds'

// Type for view names
export type ViewName = 'default' | 'pill' | 'hover' | 'expanded'

// Set up the main window
let mainWindow: BrowserWindow | null = null
let currentView: ViewName = 'default'
let debouncedClampWindow: (() => void) | null = null
let isUserDragging = false

/**
 * Ensures that the window is within the visible area of the primary display
 * Repositions the window to the bottom-right if it's outside the visible area
 */
function ensureWindowOnPrimaryDisplay(): void {
  if (!mainWindow) return

  const primaryDisplay = screen.getPrimaryDisplay()
  const { workArea } = primaryDisplay
  const bounds = mainWindow.getBounds()

  // Check if the window is completely outside the visible area
  const isWindowOutsideWorkArea =
    bounds.x >= workArea.x + workArea.width || // Too far right
    bounds.x + bounds.width <= workArea.x || // Too far left
    bounds.y >= workArea.y + workArea.height || // Too far down
    bounds.y + bounds.height <= workArea.y // Too far up

  // If window is outside visible area, reposition to bottom-right of primary display
  if (isWindowOutsideWorkArea) {
    console.log('Window outside visible area, repositioning...')

    // Get the config for the current view type
    let viewConfig: ViewConfig

    switch (currentView) {
      case 'default':
        viewConfig = getDefaultViewConfig()
        break
      case 'pill':
        viewConfig = getPillViewConfig()
        break
      case 'hover':
        viewConfig = getHoverViewConfig()
        break
      case 'expanded':
        viewConfig = getExpandedViewConfig()
        break
      default:
        viewConfig = getDefaultViewConfig()
    }

    // Set window to the bottom-right of the primary display
    mainWindow.setBounds({
      width: viewConfig.width,
      height: viewConfig.height,
      x: workArea.x + workArea.width - viewConfig.width - 20,
      y: workArea.y + workArea.height - viewConfig.height - 20
    })
  }
}

/**
 * Switch between different views
 * @param viewName The name of the view to switch to
 */
function switchView(viewName: ViewName): void {
  if (!mainWindow) return

  // Save current view name
  currentView = viewName

  // Get the configuration for the requested view
  let viewConfig: ViewConfig

  switch (viewName) {
    case 'default':
      viewConfig = getDefaultViewConfig()
      break
    case 'pill':
      viewConfig = getPillViewConfig()
      break
    case 'hover':
      viewConfig = getHoverViewConfig()
      break
    case 'expanded':
      viewConfig = getExpandedViewConfig()
      break
    default:
      viewConfig = getDefaultViewConfig()
  }

  // Apply the configuration to the window
  mainWindow.setBounds({
    width: viewConfig.width,
    height: viewConfig.height,
    x: viewConfig.x,
    y: viewConfig.y
  })

  // After view change, ensure window is in bounds (immediately, not debounced)
  clampWindowToWorkArea(mainWindow)

  // Notify the renderer about the view change
  mainWindow.webContents.send('view-changed', viewName)
}

function createWindow(): void {
  // Get the initial configuration
  const initialConfig = getDefaultViewConfig()

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: initialConfig.width,
    height: initialConfig.height,
    x: initialConfig.x,
    y: initialConfig.y,
    show: false,
    autoHideMenuBar: true,
    frame: false, // Completely frameless window without title bar or buttons
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hidden',
    alwaysOnTop: true,
    resizable: true,
    fullscreen: false,
    minWidth: 512, // Prevent resizing below the default width
    minHeight: 288, // Prevent resizing below the default height
    fullscreenable: false, // Prevent fullscreen mode
    maximizable: false, // Prevent window maximization
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      enablePreferredSizeMode: true, // Help with DPI scaling issues
      zoomFactor: 1.0 // Enforce consistent zoom level
    }
  })

  // Ensure window stays on top and visible on all workspaces (for macOS)
  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    // On macOS, explicitly disable the traffic light buttons
    mainWindow.setWindowButtonVisibility(false)
  }

  // Prevent keyboard shortcuts that could trigger fullscreen
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Prevent keyboard shortcuts for fullscreen (F11 or Cmd+Ctrl+F)
    if (input.key === 'F11' || (input.key === 'f' && input.control && input.meta)) {
      event.preventDefault()
    }
  })

  // Add double-click prevention in renderer
  mainWindow.webContents.on('did-finish-load', () => {
    // Prevent default double-click behavior that might trigger fullscreen
    mainWindow?.webContents.executeJavaScript(`
      // Prevent double click on any part of the window from maximizing
      document.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }, true);
    `)
  })

  // Force exit fullscreen if the window somehow enters it
  mainWindow.on('enter-full-screen', () => {
    // Use setTimeout to give the system time to complete the fullscreen transition
    // before forcing it back to normal
    setTimeout(() => {
      if (mainWindow && mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false)
      }
    }, 100)
  })

  // Set up display change monitoring
  setupDisplayChangeMonitoring()

  // Force consistent zoom factor for DPI consistency
  mainWindow.webContents.on('did-finish-load', () => {
    // Set zoom factor to 1.0 to ensure consistent rendering across different DPI settings
    mainWindow?.webContents.setZoomFactor(1.0)
  })

  // Create debounced window clamper - this will jump the window back when dragged below
  debouncedClampWindow = createDebouncedWindowClamper(mainWindow, 100)

  // Listen for window movements
  mainWindow.on('move', () => {
    if (mainWindow && debouncedClampWindow) {
      // Apply the debounced clamping to avoid interference during dragging
      debouncedClampWindow()
    }
  })

  // Handle drag start/end detection
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.executeJavaScript(`
      document.addEventListener('mousedown', (e) => {
        // Only notify for drag starts on the window frame or drag handle areas
        window.api.notifyDragStart()
      })
      
      document.addEventListener('mouseup', () => {
        window.api.notifyDragEnd()
      })
      
      // Also handle when cursor leaves the window during dragging
      document.addEventListener('mouseleave', () => {
        window.api.notifyDragEnd()
      })
    `)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    debouncedClampWindow = null
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Set up IPC handlers for view switching
  setupViewHandlers()
}

/**
 * Sets up display change monitoring to keep the window visible when displays change
 */
function setupDisplayChangeMonitoring(): void {
  // Handle when a display is removed (monitor unplugged)
  screen.on('display-removed', () => {
    ensureWindowOnPrimaryDisplay()
  })

  // Handle when display metrics change (resolution change, scaling change, etc.)
  screen.on('display-metrics-changed', () => {
    ensureWindowOnPrimaryDisplay()
  })

  // Handle when display availability changes (add this for completeness)
  screen.on('display-added', () => {
    ensureWindowOnPrimaryDisplay()
  })
}

function setupViewHandlers(): void {
  // Handler for switching views
  ipcMain.handle('switch-view', (_, viewName: ViewName) => {
    switchView(viewName)
    return true
  })

  // Handler for getting current view
  ipcMain.handle('get-current-view', () => {
    return currentView
  })

  // Drag monitoring handlers
  ipcMain.handle('notifyDragStart', () => {
    isUserDragging = true
  })

  ipcMain.handle('notifyDragEnd', () => {
    isUserDragging = false

    // Force an immediate bounds check after dragging ends
    if (mainWindow) {
      clampWindowToWorkArea(mainWindow, true)
    }
  })
}

// App initialization
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
