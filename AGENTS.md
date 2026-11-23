# AGENTS.md

Guidance for AI coding agents (and humans) working on Jam. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[docs/developing.md](docs/developing.md) for the full details.

## What this is

Jam is a web UI for [JoinMarket NG](https://github.com/joinmarket-ng/joinmarket-ng), focused on user-friendliness.
It is a rather lightweight front end for the JoinMarket NG API (`jmwalletd`). Bitcoin funds move through it, so
correctness matters more than speed or polish.

Stack: React 19, TypeScript, Vite, Tailwind CSS 4, Radix UI, TanStack Query and Table, zustand, react-hook-form with
yup, react-i18next, Vitest, Playwright and Storybook. Node `>=26.3.0` and npm `>=11.16.0` are required.

## Project priorities (current)

1. **Feature freeze.** v2 release candidates are coming. Until v2 is released, only bugfixes are accepted. New features
   are open again for v2.1.x.
2. **User funds must never be at risk.** Small bugs are okay, anything that could put funds at risk is not. Changes to
   sending, sweeping, coinjoins, earning or fidelity bonds need extra care, tests and a manual run against regtest.
3. **Docs for v2.** The [jamdocs](https://github.com/joinmarket-webui/jamdocs) should be ready when v2 is released,
   so they are prepared during the release candidates. Doc updates for user facing changes are welcome.
4. **Then cleanup:** simplify state handling (today it is spread over TanStack Query, zustand and React context) and
   remove the legacy `joinmarket-clientserver` backend.

Do not start broad refactors, state rewrites or legacy removal on your own. They are planned and are sequenced around
open pull requests.

## Rules

- Keep pull requests small and focused on one thing. Do not mix in unrelated cleanups.
- Only fix bugs that are real: reproduce them on `devel` first and include the steps in the pull request.
- A bugfix comes with a test that fails without the fix.
- Do not add features while the freeze is on. If something looks like a feature, open an issue instead.
- Never log, persist or send wallet passwords, seed phrases, auth tokens or other secrets.
- Do not edit generated files by hand (e.g. `package-lock.json`).
- User facing text goes through i18n (`src/i18n/locales/<lang>/translation.json`). Add new keys to `en`; the other
  locales are translated afterwards.
- Unit tests must not depend on the locale or time zone of the machine. Use `withRuntimeLocale` and `withTimeZone`
  from `src/test/` (see "Locale and Time Zone in Tests" in docs/developing.md). CI also runs `de_DE` with
  `America/New_York` and `en_IN` with `Asia/Kolkata`.
- Accessibility counts: label form controls, use `aria-live` for status text that changes, and respect
  `prefers-reduced-motion` for animations.
- Account for states that are reached without the local flow: page reload, a request started elsewhere, a lost
  response, stale data after a refetch or retry.

## Commands

```sh
npm install                 # install dependencies
npm run regtest:up          # start JoinMarket NG in regtest (Docker)
npm run regtest:init        # create and fund the wallet `Satoshi` (password `test`)
npm run dev                 # start the UI on http://localhost:5173

npm run lint                # ESLint
npm run format:check        # Prettier check (npm run format fixes lint + formatting)
npm run test:unit           # unit tests
npm test                    # all tests (unit and storybook)
npm run build               # type check (tsc -b) and production build
npm run check               # format, test and build in one go

npm run e2e:smoke:up && npm run test:e2e:smoke   # Playwright smoke test (npm run e2e:smoke:down afterwards)
npm run regtest:clear       # wipe all regtest state, then regtest:up and regtest:init again
```

Before opening a pull request, lint, format, tests and build must pass. Pull request builds fail otherwise.

## Pull requests and commits

- Fork the repository and open pull requests from your fork against `devel`.
- A maintainer squashes the pull request into `devel` using
  [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) (`fix(send): ...`, `refactor: ...`).
  Using them on your own commits is encouraged but not required.
- Write a meaningful pull request description: what changed, why, and how it was tested.

## Layout

- `src/components/<area>/` UI by feature area (`send`, `sweep`, `earn`, `wallet`, `orderbook`, `settings`, ...);
  shared building blocks live in `src/components/ui/`
- `src/context/`, `src/store/`, `src/hooks/` application state and hooks
- `src/lib/` pure helpers, `src/constants/`, `src/types/`
- `src/i18n/locales/` translations
- `tests/e2e/` Playwright smoke test, `docker/regtest/` local JoinMarket NG regtest setup
