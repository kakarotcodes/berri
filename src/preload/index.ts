import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ViewName } from '../main'

// Custom APIs for renderer
const api = {
  // View management
  switchView: (viewName: ViewName) => ipcRenderer.invoke('switch-view', viewName),
  getCurrentView: () => ipcRenderer.invoke('get-current-view'),
  onViewChanged: (callback: (viewName: ViewName) => void) => {
    ipcRenderer.on('view-changed', (_, viewName) => callback(viewName))
    return () => {
      ipcRenderer.removeAllListeners('view-changed')
    }
  },
  
  // Drag monitoring
  notifyDragStart: () => ipcRenderer.invoke('notifyDragStart'),
  notifyDragEnd: () => ipcRenderer.invoke('notifyDragEnd')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
