# Developer Docs

A place to collect useful information for developers that doesn't really fit elsewhere.

👉 See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to get started participating in this project.

## JoinMarket Development Environment

For a complete development environment you need a local JoinMarket instance that the web UI can interact with. We provide a regtest environment that should give you everything needed to get started developing with JoinMarket. You can find details here: [docker/regtest/readme.md](../docker/regtest/readme.md).

## Running Jam Against JoinMarket-NG

Jam v2 can talk directly to a separately running `jmwalletd` / orderbook watcher from `joinmarket-ng`. You do not need to run the Jam regtest compose or the reference implementation for this workflow.

### Local dev against a manually started jm-ng backend

1. Start `jmwalletd` from your `joinmarket-ng` checkout so it is reachable on `https://127.0.0.1:28183` (HTTPS API) and `wss://127.0.0.1:28283` (WebSocket).
2. Start the jm-ng orderbook watcher so it is reachable on `http://127.0.0.1:8080`.
3. In the Jam repo, run:

```bash
npm run dev
```

This uses the default `native` backend mode and proxies:

- `/api` -> `https://127.0.0.1:28183`
- `/jmws` -> `wss://127.0.0.1:28283`
- `/obwatch` -> `http://127.0.0.1:8080`

### Local dev against the Jam regtest jm-ng services

If you are using Jam's own regtest environment, the initialized jm-ng services are exposed on different host ports. In that case run:

```bash
npm run jm-ng:dev
```

That switches the Vite proxy to the jm-ng regtest ports exposed by `docker/regtest/docker-compose.yml`:

- `JMWALLETD_API_PORT=32183`
- `JMWALLETD_WEBSOCKET_PORT=32283`
- `JMOBWATCH_PORT=31800`

### Custom jm-ng ports

If your separately running jm-ng services use different ports, you can override them directly:

```bash
JMWALLETD_API_PORT=28183 \
JMWALLETD_WEBSOCKET_PORT=28283 \
JMOBWATCH_PORT=8080 \
npm run dev
```

`jmwalletd` exposes the HTTPS API and the WebSocket on separate TCP ports in jm-ng (`28183` and `28283` by default), so set both env vars when overriding.

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
