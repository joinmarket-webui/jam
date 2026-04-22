# Wallet State Friction Audit

## Scope

This audit focuses on state-related UX friction that can silently block user progress across wallet flows, especially:

- fee configuration blockers
- coinjoin precondition blockers
- empty-wallet confusion
- missing "what should I do next?" guidance

## Evidence Map (Current Code)

- Home wallet actions are always visible on the main wallet screen: `src/components/MainWalletPage.tsx`
- Send flow fee-config blocker and precondition alerting: `src/components/send/SendPage.tsx` and `src/components/send/SendForm.tsx`
- Sweep flow operation disabling conditions: `src/components/sweep/SweepPage.tsx`
- Earn flow fee-config blocker and maker state gating: `src/components/earn/EarnPage.tsx`
- Shared fee config validation logic: `src/hooks/useFeeConfigValidation.ts`

## High-Frictions Routes

| Route | Friction Type | Current Behavior | User Risk |
| --- | --- | --- | --- |
| `/` (Main Wallet) | Empty-state confusion | Wallet actions are always visible, but there is no explicit next-step guidance when balance is 0 or funds are pending confirmations. | New users can click into flows that are not yet actionable and may interpret this as app instability. |
| `/send` | Fee-config + coinjoin precondition ambiguity | Fee config missing and coinjoin preconditions are shown as separate alerts, but flow context is fragmented. | Users may see "withdraw" UI first, then discover blockers late, causing retry loops. |
| `/sweep` | Compound blockers (fee + precondition + schedule constraints) | Start conditions depend on multiple hidden checks (`maxFeesConfigMissing`, ongoing ops, rescan, precondition summary, destination validity). | Users can perceive the scheduler as "randomly disabled" without a single causal summary. |
| `/earn` | Fee-config gate + maker lifecycle dependency | Maker actions are disabled under several states; fee-config blocker appears but lacks route-level escalation guidance. | Users may not know whether the right fix is in Settings, wallet funding, or waiting for service state updates. |
| `/settings` | Discoverability | Fee controls exist, but entry to settings depends on user inference from other routes' errors. | Users often arrive only after failed attempts elsewhere. |

## Fee-Config Blockers

Observed in `SendPage`, `EarnPage`, and `SweepPage` through `useFeeConfigValidation`.

### Friction pattern

- A blocker appears per route, but there is no shared journey-state summary that says "You are blocked by missing fee config."
- Users can navigate to blocked actions before learning required setup.

### Recommendation

- Add a global route-level guidance primitive (banner/card) keyed from a shared state machine.
- Use consistent copy with direct CTA: "Set fee limits in Settings to continue."
- Keep the current local alerts, but promote one canonical blocker reason near page title.

## Coinjoin Readiness Ambiguity

Observed in `SendForm` and `SweepPage` via `buildSweepPreconditionSummary`.

### Friction pattern

- Preconditions are technically correct but split into low-level causes (missing UTXOs, missing confirmations, retries exhausted) without a single journey outcome.
- Users must infer which action unblocks them (deposit, wait, mine blocks in regtest, change source jar).

### Recommendation

- Surface a normalized readiness summary:
  - `coinjoin-ready`
  - `needs-confirmations`
  - `needs-eligible-utxo`
  - `retry-locked`
- Attach one explicit next action per state (for example: "Choose a jar with confirmed UTXOs" or "Wait for confirmations").

## Empty Wallet Dead Ends

Most visible on main wallet and send/sweep entry points.

### Friction pattern

- Empty wallets still present advanced actions immediately.
- No progressive onboarding cue explains the intended sequence: Receive -> wait confirmations -> Send/Earn/Sweep.

### Recommendation

- On the main wallet page, use state-aware hints from `data-journey-state`:
  - `empty-wallet`: show primary CTA to Receive page
  - `awaiting-confirmation`: show "waiting for confirmations" status
  - `ready`: show advanced actions normally

## Missing Next-Step Guidance

### Current gap

- The app has rich state data but decision support is distributed across independent components.
- Users must mentally merge wallet status, service status, and operation-specific blockers.

### Recommendation (priority order)

1. Introduce a shared journey-state model used by home, send, earn, and sweep.
2. Standardize blocker messaging with one "primary reason" and one "next action" per route.
3. Add analytics (or debug counters in dev) for blocker frequency to guide iteration.
4. Add integration tests that assert guidance state for common journeys (empty, pending, blocked by fee config, ready).

## Expected Outcome

Consolidating these states into explicit guidance should reduce failed action attempts, shorten time-to-first-successful-flow, and make onboarding materially clearer for first-time JoinMarket users.

## Immediate Low-Risk Improvements

1. Add a compact status banner on `/` keyed by `data-journey-state` with one next action.
2. Reuse one shared guidance component in Send/Earn/Sweep for fee-config blockers.
3. Standardize precondition copy around one sentence format: "Blocked because X. Do Y."
4. Add route-level smoke tests that assert at least one blocker explanation is visible when actions are disabled.

## Suggested Acceptance Criteria (Follow-up PR)

1. Home route displays a primary "next step" hint for `empty-wallet`, `awaiting-confirmation`, and `action-required`.
2. Send/Earn/Sweep each expose exactly one primary blocker summary above form controls when disabled.
3. Fee-config blocker copy and CTA target are consistent across all affected routes.
4. Added tests cover:
   - journey-state precedence
   - blocker summary rendering on disabled action routes
   - regression case where wallet has mixed UTXO confirmation levels
