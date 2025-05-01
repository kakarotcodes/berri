// global.d.ts
export {}

declare global {
  interface Window {
    resizeToPill: () => void
  }
}
