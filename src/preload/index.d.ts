import { ElectronAPI } from '@electron-toolkit/preload'

type ViewName = 'default' | 'pill' | 'hover' | 'expanded'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // View management
      switchView: (viewName: ViewName) => Promise<boolean>
      getCurrentView: () => Promise<ViewName>
      onViewChanged: (callback: (viewName: ViewName) => void) => () => void
      
      // Drag monitoring
      notifyDragStart: () => Promise<void>
      notifyDragEnd: () => Promise<void>
    }
  }
}
