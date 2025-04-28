const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/context/ServiceInfoContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const searchText = `  // Fetch rescan progress when rescanning is true
  useEffect(() => {
    if (!serviceInfo?.rescanning || !currentWallet) return

    const abortCtrl = new AbortController()

    const fetchRescanProgress = async (): Promise<void> => {
      try {
        const res = await Api.getRescanInfo({
          signal: abortCtrl.signal,
          token: currentWallet.token,
          walletFileName: currentWallet.walletFileName,
        })

        if (res.ok) {
          const data = await res.json()
          if (!abortCtrl.signal.aborted && data.progress !== undefined) {
            dispatchServiceInfo({
              rescanProgress: data.progress,
            })
          }
        }
      } catch (err) {
        if (!abortCtrl.signal.aborted) {
          console.error('Error fetching rescan progress:', err)
        }
      }
    }

    fetchRescanProgress()

    let interval: NodeJS.Timeout
    setIntervalDebounced(fetchRescanProgress, RESCAN_PROGRESS_INTERVAL, (timerId) => (interval = timerId))

    return () => {
      clearInterval(interval)
      abortCtrl.abort()
    }
  }, [serviceInfo?.rescanning, currentWallet, dispatchServiceInfo])`;

const replaceText = `  // Fetch rescan progress when rescanning is true
  useEffect(() => {
    if (!serviceInfo?.rescanning || !currentWallet) return

    const abortCtrl = new AbortController()
    // Flag to track if the API is supported
    let isRescanProgressApiSupported = true

    const fetchRescanProgress = async (): Promise<void> => {
      // Skip if API is not supported (returned 404 previously)
      if (!isRescanProgressApiSupported) return

      try {
        const res = await Api.getRescanInfo({
          signal: abortCtrl.signal,
          token: currentWallet.token,
          walletFileName: currentWallet.walletFileName,
        })

        if (res.ok) {
          const data = await res.json()
          if (!abortCtrl.signal.aborted && data.progress !== undefined) {
            dispatchServiceInfo({
              rescanProgress: data.progress,
            })
          }
        } else if (res.status === 404) {
          // API not supported (backend version < v0.9.12)
          isRescanProgressApiSupported = false
          console.log('Rescan progress API not supported by this backend version')
        }
      } catch (err) {
        if (!abortCtrl.signal.aborted) {
          console.error('Error fetching rescan progress:', err)
          // If we get a 404 error, mark the API as not supported
          if (err instanceof Api.JmApiError && err.status === 404) {
            isRescanProgressApiSupported = false
            console.log('Rescan progress API not supported by this backend version')
          }
        }
      }
    }

    fetchRescanProgress()

    let interval: NodeJS.Timeout
    setIntervalDebounced(fetchRescanProgress, RESCAN_PROGRESS_INTERVAL, (timerId) => (interval = timerId))

    return () => {
      clearInterval(interval)
      abortCtrl.abort()
    }
  }, [serviceInfo?.rescanning, currentWallet, dispatchServiceInfo])`;

const updatedContent = content.replace(searchText, replaceText);

fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('ServiceInfoContext.tsx updated successfully');
