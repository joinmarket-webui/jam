# Developer Docs

A place to collect useful information for developers that doesn't really fit elsewhere.

👉 See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to get started participating in this project.

## JoinMarket Development Environment

For a complete development environment you need a local JoinMarket instance that the web UI can interact with. We provide a regtest environment that should give you everything needed to get started developing with JoinMarket. You can find details here: [docker/regtest/readme.md](../docker/regtest/readme.md).

## Simulating Wallet Journey States in Regtest

Use this workflow to verify wallet journey states and route-level blockers during local development.

### 1. Start regtest and run Jam

```bash
npm run regtest:up
npm run regtest:init
npm run dev
```

Then log in with a regtest wallet (for example `Satoshi.jmdat` / `test`).

When checking the main wallet route, inspect the primary wallet container in the browser and confirm the expected `data-journey-state` value.

### 2. Simulate each journey state

#### Empty wallet

1. Create a new wallet in Jam and do not fund it.
2. Open `/`, `/send`, and `/sweep`.
3. Confirm the main wallet route exposes `data-journey-state="empty-wallet"`.
4. Confirm empty-state messaging and disabled or guarded actions are clear.

Note: `fund-wallet.sh` is not suitable for this case because it creates UTXOs.

#### Funded wallet (confirmed)

```bash
./docker/regtest/fund-wallet.sh --wallet-name Satoshi.jmdat --password test --blocks 1
```

Use this to confirm normal paths where spendable funds are present.

#### Pending confirmation

```bash
./docker/regtest/fund-wallet.sh --wallet-name Satoshi.jmdat --password test --blocks 1 --unmatured
```

Before mining additional blocks, verify `/send` and `/sweep` surface confirmation-related preconditions.
On the main wallet route, confirm the journey state reflects a wait-for-confirmation condition rather than a ready state.

#### Fee config incomplete

In dev mode you can force missing fee configuration:

```bash
VITE_FORCE_FEE_CONFIG_MISSING=true npm run dev
```

Then verify `/send`, `/earn`, and `/sweep` show the fee-config blocker with a clear path to settings.
The main wallet route should remain usable; this check is specifically about action routes that depend on fee settings.

#### Coinjoin ready

1. Use a wallet with confirmed UTXOs.
2. Ensure fee config is present (disable `VITE_FORCE_FEE_CONFIG_MISSING`).
3. Confirm no conflicting operation is running (maker/scheduler/coinjoin).
4. Open `/` and confirm the wallet is no longer in an empty or waiting state.
5. Open `/send` or `/sweep` and verify precondition warnings are cleared.

### 3. Manual verification checklist

| Scenario | Routes to check | Expected result |
| --- | --- | --- |
| Empty wallet | `/`, `/send`, `/sweep` | Main wallet has `data-journey-state="empty-wallet"` and user sees a clear next step |
| Funded wallet | `/`, `/send` | Standard actions are available |
| Pending confirmation | `/`, `/send`, `/sweep` | Main wallet shows a waiting state and confirmation wait is explained before action |
| Fee config incomplete | `/send`, `/earn`, `/sweep` | Fee-config blocker appears with settings CTA |
| Coinjoin ready | `/`, `/send`, `/sweep` | Main wallet no longer shows an early blocker state and collaborative actions can proceed |

If script names or flags differ in your environment, use equivalent commands from [docker/regtest/readme.md](../docker/regtest/readme.md) and verify the same UI outcomes.

## Linting

We use Create React App's [default ESLint integration](https://create-react-app.dev/docs/setting-up-your-editor/#displaying-lint-output-in-the-editor).
You'll see linting issues in the console when running the app with `npm run dev`.
Pull request builds will fail if ESLint is not happy with the code.

## Code Formatting

We use the [Prettier](https://prettier.io/) code formatter to keep a consistent code style.
Pull request builds will fail if Prettier is not happy with the code.
There's a couple of options on how to setup Prettier so that it formats your code automatically:

### NPM Script

Running `npm run format` will format the whole codebase.

### Editor Integration

Prettier has great [editor integrations](https://prettier.io/docs/en/editors.html) which will automatically format all files you touch.

### Git Pre-Commit Hook

You can use a pre-commit hook that will automatically format all changes before comitting them to Git.
We use [husky](https://github.com/typicode/husky) and [lint-staged](https://github.com/okonet/lint-staged) for that.

By default, the hook will be installed automatically as an [NPM postinstall script](https://docs.npmjs.com/cli/v6/using-npm/scripts#npm-install).

### Troubleshooting

If you're having issues with Husky not using the correct `$PATH`, you may need to setup a `~/.huskyrc` which will let you set up your path before the hook is run.
See [here](https://typicode.github.io/husky/#/?id=command-not-found) for more info.

## Running the Web UI Locally and Connecting to a Remote JoinMarket Instance

These instructions assume you want to run the web UI locally and connect it to a JoinMarket instance on your RaspiBlitz.
The process should be similar for other setups.
If you run the Web UI and JoinMarket on the same system, simply skip the SSH tunnel step.

### 🚨 Prerequisite: JoinMarket

To run the web UI locally you need to connect it to a running JoinMarket instance.

#### 1. Install JoinMarket

Install [JoininBox](https://github.com/openoms/joininbox) on your [RaspiBlitz](https://github.com/rootzoll/raspiblitz):

```
Services > j [BTC JoinMarket+JoininBox menu]
```

Or follow the JoinMarket [installation guide](https://github.com/JoinMarket-Org/joinmarket-clientserver#quickstart---recommended-installation-method-linux-and-macos-only) if you're on another system.

### 🚨 Prerequisite: JoinMarket API Service

This app makes use of the JoinMarket RPC API. For this, you will need JoinMarket version 0.9.3 or higher. If needed you can upgrade JoinMarket to the latest commit via the JoininBox menu on your RaspiBlitz: Type `jm` in the command line and select `UPDATE > ADVANCED > JMCOMMIT`. This will install the latest development version from JoinMarket's master branch.

#### 2. SSL Certificate

As the joinmarket user on your RaspiBlitz, generate a self-signed certificate for the JoinMarket API Service as described [here](https://linuxize.com/post/creating-a-self-signed-ssl-certificate/), and put the certificate and the key in the `~/.joinmarket/ssl/` directory.

_Hint:_ To login as the JoinMarket user, you can ssh into your RaspiBlitz, type `jm`, and exit the JoininBox menu.

Create the SSL directory:

```bash
(jmvenv) joinmarket@raspberrypi:~ $ mkdir ~/.joinmarket/ssl/
```

Generate the certificate and associated key:

```bash
openssl req -newkey rsa:4096 -x509 -sha256 -days 3650 -nodes -out ~/.joinmarket/ssl/cert.pem -keyout ~/.joinmarket/ssl/key.pem
```

_Hint:_ You don't have to enter anything meaningful, you can just hit the return key a couple of times.

#### 3. API Service

Start the JoinMarket [API service](https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/JSON-RPC-API-using-jmwalletd.md):

```bash
(jmvenv) joinmarket@raspberrypi:~/joinmarket-clientserver/scripts $ python jmwalletd.py
```

You should see the following:

```text
2021-11-18 18:16:57,639 [INFO]  Starting jmwalletd on port: 28183
2021-11-18 18:16:57,661 [INFO]  Joinmarket daemon listening on port 27183
```

#### 4. SSH Tunnel

Create an SSH tunnel for the API service. On the machine where you want to run the web UI, add the following lines to your `~/.ssh/config` file:

```conf
Host raspiblitz
  HostName 192.168.X.X # (IP address of your RaspiBlitz)
  User admin
  ForwardAgent yes
  LocalForward 28183 localhost:28183
```

### 💻 Download, Install, Jam

In short:

```bash
git clone https://github.com/joinmarket-webui/jam.git
cd jam/
npm install && npm run dev
```

## Resources

- yup (GitHub): https://github.com/jquense/yup
- react-hook-form (GitHub): https://github.com/react-hook-form/react-hook-form
- react-query (GitHub): https://github.com/TanStack/query
