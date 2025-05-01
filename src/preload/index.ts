import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  resizeToPill: () => ipcRenderer.invoke('resize-to-pill'),
  expandPill: () => ipcRenderer.invoke('expand-pill'),
  collapsePill: () => ipcRenderer.invoke('collapse-pill'),
  movePill: (y: number) => ipcRenderer.invoke('move-pill', y),
  restoreWindow: () => ipcRenderer.invoke('restore-window'),
  onWindowStateChange: (callback: (state: 'pill' | 'normal') => void) => {
    ipcRenderer.on('window-state-changed', (_, state) => callback(state))
  },
  onHoverStateChange: (callback: (hovered: boolean) => void) => {
    ipcRenderer.on('hover-state-changed', (_, hovered) => callback(hovered))
  }
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
