# Baseline Coverage Notes

## Test environment

- Framework: Jest via `react-scripts` (CRA)
- Test runner: `CI=true npm test -- --coverage --watchAll=false`
- Coverage reporter: Istanbul (built into react-scripts)

## Pre-PR baseline (upstream master at v0.4.1, commit dcfab49)

Running the test suite with coverage restricted to the test files that existed
at dcfab49 (i.e., excluding the seven test files added in this PR):

| Metric     | Value  |
|------------|--------|
| Statements | 27.58% |
| Branches   | 17.26% |
| Functions  | 21.34% |
| Lines      | 28.04% |

Test suites: 14 | Tests: 119

## Target files — absent from pre-PR coverage output

These files were not imported (directly or transitively) by the pre-existing test
files, so they did not appear in the coverage report at all:

| File | Risk | Reason |
|---|---|---|
| `src/components/Send/helpers.ts` | High | Pure validation logic for all send amounts and addresses |
| `src/constants/features.ts` | High | Version-gated feature flags control UI availability |
| `src/components/utxo/utils.ts` | Medium | UTXO tag classification drives UI display logic |
| `src/components/Send/SendForm.tsx` | High | Central form controlling send transaction construction |
| `src/components/Send/index.tsx` | High | Orchestrates direct send and coinjoin flows |
| `src/components/Earn.tsx` | High | Maker start/stop lifecycle and fee configuration |
| `src/components/settings/FeeConfigModal.tsx` | Medium | Fee configuration that affects transaction economics |

## Post-PR coverage (feat/test-coverage)

After adding 169 tests across 22 suites:

| Metric     | Before | After  |
|------------|--------|--------|
| Statements | 27.58% | 38.79% |
| Branches   | 17.26% | 28.70% |
| Functions  | 21.34% | 31.08% |
| Lines      | 28.04% | 39.53% |

Per-file coverage for the seven target files:

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `Send/helpers.ts` | 86.66% | 80.00% | 83.33% | 86.66% |
| `constants/features.ts` | 100% | 100% | 100% | 100% |
| `utxo/utils.ts` | 100% | 92.85% | 100% | 100% |
| `Send/SendForm.tsx` | 59.21% | 49.52% | 52.38% | 57.74% |
| `Send/index.tsx` | 40.11% | 26.85% | 36.95% | 39.02% |
| `Earn.tsx` | 42.85% | 35.53% | 29.09% | 44.44% |
| `settings/FeeConfigModal.tsx` | 47.05% | 38.88% | 38.09% | 46.34% |

## Notable uncovered files (high risk, no tests added)

These files remain uncovered because they require full integration setup
(wallet unlock, WebSocket session, fidelity bond state) that is out of scope
for this PR:

| File | Risk |
|---|---|
| `src/components/fb/CreateFidelityBond.tsx` | High |
| `src/components/fb/SpendFidelityBondModal.tsx` | High |
| `src/components/jar_details/JarDetailsOverlay.tsx` | High |
| `src/hooks/WaitForUtxosToBeSpent.ts` | Medium |

## Threshold justification

Global thresholds are set at `floor(measured_after)` — the minimum the test suite
reliably clears. This prevents false passing while not inflating the bar above
what the tests actually deliver.

The `Send/` folder threshold is set tighter (statements 42, branches 38,
functions 31, lines 43) because Send is a wallet-critical path and its coverage
is meaningfully higher than the global average. Regressions here should fail CI
independently of the global gate.

Note: Jest's internal branch and line computations differ slightly from the
rounded table values. Global thresholds for branches (27) and lines (38) are
set at `floor(jest_internal_value)` — the table shows 28.70% branches and
39.53% lines, but Jest computes 27.2% and 38.98% respectively when checking
thresholds.
