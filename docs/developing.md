# Developer Docs

A place to collect useful information for developers that doesn't really fit elsewhere.

👉 See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to get started participating in this project.

## JoinMarket Development Environment

For a complete development environment you need a local JoinMarket NG instance that the web UI can interact with. We provide a regtest environment that should give you everything needed to get started developing with JoinMarket NG. You can find details here: [docker/regtest/readme.md](../docker/regtest/readme.md).

## Running Jam Against JoinMarket NG

Jam v2 can talk directly to a separately running `jmwalletd` / orderbook watcher from `joinmarket-ng`. You do not need to run the Jam regtest compose or the reference implementation for this workflow.

### Local dev against the Jam regtest joinmarket-ng services

If you are using Jam's own regtest environment, the initialized joinmarket-ng services are exposed on specific host ports. In that case run:

```bash
npm run dev:ng:native
```

If your separately running joinmarket-ng services use different ports, you can override them directly:

```bash
JAM_BACKEND=joinmarket-ng \
JMWALLETD_API_PORT=28183 \
JMWALLETD_WEBSOCKET_PORT=28283 \
JMOBWATCH_PORT=8080 \
npm run dev
```

## Storybook

Storybook is used to inspect reusable UI and Jam components in isolation without running a full wallet flow.

Run it locally with:

```bash
npm run storybook:up
```

Build the static Storybook preview with:

```bash
npm run storybook:build
```

The Storybook Pages workflow publishes the latest `devel` version through GitHub Pages once Pages is configured to use GitHub Actions as its source.

Hosted preview:

```text
https://joinmarket-webui.github.io/jam/
```

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

## Running the Web UI Locally and Connecting to a Remote JoinMarket NG Instance

These instructions assume you want to run the web UI locally and connect it to a JoinMarket NG instance on your RaspiBlitz.
The process should be similar for other setups.
If you run the Web UI and JoinMarket NG on the same system, simply skip the SSH tunnel step.

### 🚨 Prerequisite: JoinMarket NG

To run the web UI locally you need to connect it to a running JoinMarket NG instance.

#### 1. Install JoinMarket NG

Install [JoininBox](https://github.com/openoms/joininbox) on your [RaspiBlitz](https://github.com/rootzoll/raspiblitz):

```
Services > j [BTC JoinMarket+JoininBox menu]
```

Or follow the JoinMarket NG [installation guide](https://joinmarket-ng.github.io/joinmarket-ng/install/) if you're on another system.

### 🚨 Prerequisite: JoinMarket NG API Service

This app makes use of the JoinMarket NG API.

#### 2. SSL Certificate

As the joinmarket user on your RaspiBlitz, generate a self-signed certificate for the JoinMarket NG API Service as described [here](https://linuxize.com/post/creating-a-self-signed-ssl-certificate/), and put the certificate and the key in the `~/.joinmarket-ng/ssl/` directory.

_Hint:_ To login as the JoinMarket user, you can ssh into your RaspiBlitz, type `jm`, and exit the JoininBox menu.

Create the SSL directory:

```bash
(jmvenv) joinmarket@raspberrypi:~ $ mkdir ~/.joinmarket-ng/ssl/
```

Generate the certificate and associated key:

```bash
openssl req -newkey rsa:4096 -x509 -sha256 -days 3650 -nodes -out ~/.joinmarket-ng/ssl/cert.pem -keyout ~/.joinmarket-ng/ssl/key.pem
```

_Hint:_ You don't have to enter anything meaningful, you can just hit the return key a couple of times.

#### 3. API Service

Start the JoinMarket NG [API service](https://joinmarket-ng.github.io/joinmarket-ng/README-jmwalletd/):

```bash
(jmvenv) joinmarket@raspberrypi:~/joinmarket-ng $ jmwalletd serve
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
