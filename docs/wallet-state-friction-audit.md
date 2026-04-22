# Wallet-State Friction Audit

## Scope

Routes reviewed for silent stuck states and unclear recovery paths:

- `/`
- `/send`
- `/sweep`
- `/earn`

## Findings

| Route    | Problem                                                                              | Why it blocks users                                                                                                                                                                                              | Suggested improvement                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/send`  | Silent form lock when maker is running or wallet is rescanning                       | The Send form is disabled by state gate logic, but there is no dedicated in-page reason for maker/rescan lock on this route. Users can see controls but cannot proceed, without a clear unblock action.          | Add explicit blocking alerts for maker-running and rescanning on Send (same style as existing coinjoin warning), with direct CTA links to `/earn` (stop maker) or `/settings/rescan` status.     |
| `/send`  | Fee configuration blocker is only fully enforced at coinjoin submit time             | Fee missing is shown as a banner, but coinjoin flow is still interactive until submit, then hard-blocks and opens config dialog. This creates a late failure moment.                                             | Make coinjoin path pre-disabled when fee config is missing and show a single inline "Configure fee limits to continue" state near the submit button (keep existing dialog CTA).                  |
| `/send`  | Coinjoin preconditions warning allows "send despite warning" without guided recovery | Preconditions render as warning text and the primary action remains available as "send despite warning", so users may keep retrying instead of resolving root cause (confirmations, missing UTXOs, retry locks). | Add contextual next-step CTA in warning block: "Deposit to source jar", "Wait for confirmations", or "Switch source jar", and only show "send despite warning" for non-blocking warning classes. |
| `/sweep` | Start action can be silently disabled during rescanning                              | Sweep computes `isOperationDisabled` with rescanning and preconditions, but only maker/coinjoin cases are explicitly alerted. Rescan lock lacks a direct explanatory alert on this page.                         | Add a rescanning warning alert above controls with a progress/status link to `/settings/rescan`, and include reason text beside disabled start button.                                           |
| `/sweep` | Multi-factor disable state obscures single next step                                 | Start can be disabled by fee config, collaborative activity, preconditions, destination validation, waiting state; user sees a disabled button but may not know which condition is primary.                      | Add a compact "blocking checklist" summary (first unmet condition only) directly above the Start button, with one actionable instruction at a time.                                              |
| `/earn`  | Earn form disabled for coinjoin/rescan without explicit route-level explanation      | Form disable logic includes `coinjoin_in_process` and `rescanning`, but route alerts focus on maker state and offer loading; users may encounter disabled form without clear remediation.                        | Add explicit alerts for "Coinjoin in progress" and "Rescanning in progress" on Earn, with direct guidance ("stop/finish coinjoin first" or "wait for rescan completion").                        |
| `/`      | Empty wallet state is implicit, not explicit                                         | Zero balance is rendered as a normal value; users must infer they need to fund first. There is no dedicated empty-state explanation or guided path.                                                              | Add explicit empty-wallet callout when total balance is zero, with a primary CTA to Receive and a secondary "How coinjoin readiness works" hint.                                                 |

## Priority

1. Add explicit reason banners for disabled Send/Earn/Sweep actions (maker, rescanning, active coinjoin).
2. Convert late fee-config failure on Send into an early inline blocker with direct settings action.
3. Add empty-wallet explicit state on Main Wallet with clear first-step CTA.
