# Wallet State Friction Audit

This is a short audit of places where the wallet can feel unclear to a user. The goal is not to redesign the whole flow, but to make each state easier to understand.

## Empty Wallet

Problem: A new wallet can show a balance of zero, but the user may not know what to do next.

Why it is confusing: The page still shows normal wallet actions, so it can feel like something is missing or broken.

Simple improvement: Show a small empty-state message near the balance, with a clear primary action to receive bitcoin.

## Missing Fee Configuration

Problem: Some wallet actions depend on fee settings being available.

Why it is confusing: If fee values are missing, the user may only find out after trying to send or use a coinjoin-related flow.

Simple improvement: Surface a short warning earlier, with a link or button to open fee settings.

## Loading State

Problem: The wallet needs time to load balance, jars, addresses, and service data.

Why it is confusing: A user may see partial data and not know if the wallet is ready yet.

Simple improvement: Keep the loading state clear and avoid showing action prompts that depend on wallet data until loading is done.

## Backend or Service Dependency

Problem: Jam depends on backend services such as the JoinMarket wallet API and coinjoin-related processes.

Why it is confusing: If the backend is unavailable, the UI may look fine but actions can fail or stall.

Simple improvement: Show a simple service status message when the backend cannot be reached, with a retry action and plain explanation.

## Summary

The wallet should make the next step obvious. Empty wallets should guide users to receive funds, missing fee config should point to settings, loading should not look ready, and backend problems should be shown as service issues instead of generic failures.
