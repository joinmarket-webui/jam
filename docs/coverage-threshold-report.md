# Coverage Threshold Proposal

## package.json JSON snippet

```json
{
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts",
      "!src/**/*.stories.{ts,tsx}",
      "!src/**/index.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 35,
        "functions": 45,
        "lines": 50,
        "statements": 50
      },
      "./src/components/send/": {
        "branches": 60,
        "functions": 70,
        "lines": 70,
        "statements": 70
      },
      "./src/components/earn/": {
        "branches": 50,
        "functions": 60,
        "lines": 60,
        "statements": 60
      }
    }
  }
}
```

## Short technical justification

1. Global thresholds are moderate for the current baseline, where many UI and integration-heavy files are still uncovered.
2. Send and Earn have stricter per-folder thresholds because they are wallet-critical paths with higher regression risk.
3. Branch thresholds are slightly lower than lines/statements/functions because conditional paths in hooks and UI logic are harder to fully cover in unit tests.
4. This configuration creates a practical ratchet: realistic minimums now, with stronger safety guarantees for high-risk transaction flows.
