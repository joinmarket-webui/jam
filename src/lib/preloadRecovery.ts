const RELOAD_KEY = 'jam:preload-error-reload'

export function claimPreloadReload(buildUrl: string): boolean {
  try {
    // The production entry URL is hashed. Keep the guard across reloads of the same build.
    if (window.sessionStorage.getItem(RELOAD_KEY) === buildUrl) return false
    window.sessionStorage.setItem(RELOAD_KEY, buildUrl)
    return true
  } catch {
    // Without a persistent guard, let the normal error boundary handle the failure.
    return false
  }
}
