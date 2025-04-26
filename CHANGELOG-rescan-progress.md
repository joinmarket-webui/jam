# Rescan Progress Percentage Implementation

## Changes Made

### 1. Updated `src/context/ServiceInfoContext.tsx`
- Added `rescanProgress: number | null` to the `JmSessionData` interface
- Added `RescanBlockchainProgress` type with `rescanProgress: number | null` property
- Included `RescanBlockchainProgress` in the `ServiceInfo` type
- Updated the `reloadServiceInfo` function to handle the `rescanProgress` property from the API response

### 2. Updated `src/components/RescanChain.tsx`
- Modified the rescan alert message to display the progress percentage:
  ```jsx
  {serviceInfo?.rescanning === true && <rb.Alert variant="success">
    {t('app.alert_rescan_in_progress')} ({serviceInfo?.rescanProgress ?? 0}%)
  </rb.Alert>}
  ```

## Description
This implementation displays the blockchain rescan progress as a percentage in the UI, allowing users to better estimate the time remaining for the rescan operation to complete. The progress percentage is provided by the backend through the PR [JoinMarket-Org/joinmarket-clientserver#1696](https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/1696).

## Testing
- The UI now shows "Rescanning in progress (X%)" where X is the current progress percentage
- If the progress value is null or undefined, it defaults to 0%
- The progress updates automatically as the rescan operation progresses

## Related Issues
Closes #744

# Testing the Rescan Progress Percentage Implementation

## Prerequisites
1. Ensure the backend changes from [PR #1696](https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/1696) are applied to your joinmarket-clientserver installation
2. Make sure both the backend (jmwalletd) and frontend (Jam UI) services are running

## Testing Steps

### 1. Start the Application
```bash
npm start
```

### 2. Access the Rescan Chain Page
- Log in to your wallet
- Navigate to Settings
- Click on "Rescan Blockchain"

### 3. Initiate a Blockchain Rescan
- Enter a blockheight from which to start the rescan (e.g., the SegWit activation block)
- Click the "Start Rescan" button

### 4. Observe the Progress Percentage
- Once the rescan starts, you should see a success alert with the message "Rescanning in progress (X%)"
- The percentage should update automatically as the rescan progresses
- Initially, it might show "Rescanning in progress (0%)"

## Verification
- The percentage should increase over time as the rescan progresses
- When the rescan completes, the alert should disappear

## Troubleshooting
- If you don't see the percentage, check that the backend is properly sending the progress information
- Verify in the browser's network tab that the session API response includes the `rescanProgress` field
- Check the browser console for any JavaScript errors

## Implementation Details
The implementation consists of two main changes:

1. Added `rescanProgress` property to `ServiceInfoContext.tsx`:
```typescript
// In JmSessionData interface
rescanProgress: number | null
```

2. Updated the alert in `RescanChain.tsx` to display the progress:
```jsx
{serviceInfo?.rescanning === true && 
  <rb.Alert variant="success">
    {t('app.alert_rescan_in_progress')} ({serviceInfo?.rescanProgress ?? 0}%)
  </rb.Alert>
}
```

This implementation works with the backend updates from PR #1696 in the joinmarket-clientserver repository, which provides the rescan progress information to the frontend.