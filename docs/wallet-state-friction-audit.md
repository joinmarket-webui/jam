# Wallet State Friction Audit

## Goal

Identify where wallet users can be blocked without a clear next step, with focus on:

- fee configuration blockers
- coinjoin precondition blockers
- empty-wallet confusion

This audit is based on current behavior in:

- `src/components/MainWalletPage.tsx`
- `src/components/send/SendPage.tsx`
- `src/components/sweep/SweepPage.tsx`
- `src/components/earn/EarnPage.tsx`
- `src/hooks/useFeeConfigValidation.ts`

## Summary

The main friction is not missing validation. The app already checks the right things in most places. The gap is that blocker reasons are route-local, differently phrased, and often shown after the user has already started a flow. That creates avoidable confusion during first use.

## Friction Map

| Route | Silent blocker or ambiguity | Why users get confused | Severity |
| --- | --- | --- | --- |
| `/` (Main wallet) | Action buttons are visible even when wallet is empty or funds are not actionable yet | UI invites action before readiness is obvious | High |
| `/send` | Multiple blockers can stack (`maxFeesConfigMissing`, coinjoin state, UTXO readiness) | Users often see destination/amount UI first, then discover blockers later | High |
| `/sweep` | Start action is gated by fee config, running operations, rescans, preconditions, destination validity | Disabled state can feel "random" because no single primary blocker reason is surfaced | High |
| `/earn` | Maker lifecycle states + fee config gate + bond constraints | Users may not know whether they should wait, fund, or change settings | Medium |
| `/settings` | Fee controls exist but are usually discovered only after failures elsewhere | Remediation path is indirect instead of guided | Medium |

## Key Findings

### 1) Fee-config blockers are technically correct but fragmented

`useFeeConfigValidation` is reused across Send/Earn/Sweep, which is good for consistency. The UX gap is that each route explains the blocker in isolation. Users do not get one global answer to: "What is blocking me right now?"

Impact:

- repeated failed attempts across routes
- increased support burden ("why is this disabled?")
- slower time-to-first-successful transaction

This is the clearest low-risk opportunity because the validation already exists and only the guidance layer is missing.

### 2) Coinjoin preconditions are exposed as low-level checks, not outcomes

Send/Sweep correctly check confirmations, UTXO readiness, and in-progress operations. But the user-facing model is still implementation-level. Users need to infer next steps from multiple alerts.

Impact:

- high cognitive load for first-time users
- avoidable retries and route switching

The current behavior is defensively correct, but it asks users to translate internal conditions into actions.

### 3) Empty wallet state lacks guided progression

Main wallet shows advanced actions immediately, even when the next logical step is simply "receive funds first." The app has the data needed to guide users, but guidance is not yet centralized.

Impact:

- weak first-run onboarding
- users misinterpret valid guards as instability

This is the highest-visibility onboarding gap because it appears on the first meaningful screen after login.

## Recommended Improvements

### Quick wins (small, low risk)

1. Add one primary blocker summary at the top of Send/Earn/Sweep when actions are disabled.
2. Standardize copy shape: "Blocked because X. Next step: Y."
3. On the main wallet route, show a single next-step hint when wallet is empty or awaiting confirmations.
4. Reuse one shared guidance primitive so wording and CTA targets do not drift by route.

### Medium-term (incremental architecture)

1. Derive a shared journey state from wallet + service + fee-config signals.
2. Map each journey state to exactly one primary CTA.
3. Keep existing local guards, but make route-level guidance deterministic and consistent.

### Long-term (product feedback loop)

1. Add lightweight telemetry/debug counters for blocker frequency by route.
2. Use the data to prioritize copy and flow improvements.
3. Add integration tests for common journeys (empty wallet, pending confirmations, fee-config missing, ready).

## Acceptance Criteria for Follow-up UX Work

1. Every disabled primary action exposes a visible, plain-language reason.
2. Every blocker reason includes one concrete next step.
3. Fee-config messaging is consistent across `/send`, `/earn`, and `/sweep`.
4. Main wallet communicates first-run progression (fund -> confirm -> transact).
5. Tests cover blocker precedence and at least one route-level guidance assertion per flow.

## Suggested Scope for an Initial PR

1. Start on the main wallet route with a derived journey state and one next-step hint.
2. Reuse the same journey state or blocker vocabulary on one action route, preferably `/send`.
3. Keep the first PR additive and UI-only so existing backend and validation behavior remain unchanged.

## Why This Matters

JoinMarket concepts are powerful but non-trivial. Clear state-aware guidance improves user trust, reduces trial-and-error, and lowers onboarding drop-off without changing backend behavior.
