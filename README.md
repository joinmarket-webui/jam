# JoinMarket Web UI

For now this repository is supposed to be a central place to collect resources related to the JoinMarket Web UI project.
We'll see what collaboration tools suit use as we go forward.
Suggestions and feedback welcome!

- 🔗 Join our [Telegram group](https://t.me/JoinMarketWebUI).
- 👉 Check out the [Wiki](https://github.com/joinmarket-webui/joinmarket-webui/wiki) for resources such as meeting notes, call recordings, ideas, and discussions.

This project builts upon work done by [Shobhitaa](https://github.com/shobhitaa), [Abhishek](https://github.com/abhishek0405), and [Adam](https://github.com/AdamISZ) (waxwing) himself.
GitHub repository: [JoinMarket-Org/jm-web-client](https://github.com/JoinMarket-Org/jm-web-client)

## Local development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Setup

Here is how you can set it up and play around with it yourself.

### Docker (regtest)

See the [docker regtest setup readme](docker/regtest/readme.md).

### RaspiBlitz Setup

#### Prerequisite: RaspiBlitz with JoinMarket

1. Install [JoininBox](https://github.com/openoms/joininbox) on your [RaspiBlitz](https://github.com/rootzoll/raspiblitz):

You can install it via the RaspiBlitz Services menu: `Services > j [BTC JoinMarket+JoininBox menu]`

This app makes use of the JoinMarket [RPC API](https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/996).
For this, you will need JoinMarket [version 0.9.3](https://github.com/JoinMarket-Org/joinmarket-clientserver/releases/tag/v0.9.3) or higher.
If needed you can upgrade JoinMarket to the latest commit via the JoininBox menu on your RaspiBlitz: Type `jm` in the command line and select ```UPDATE > ADVANCED > JMCOMMIT```.
This will install the latest development version from JoinMarket's master branch.

#### Prerequisite: JoinMarket API Service

2. As the joinmarket user on your RaspiBlitz, generate a self-signed certificate for the JoinMarket API Service as described [here](https://linuxize.com/post/creating-a-self-signed-ssl-certificate/), and put the certificate and the key in the `~/.joinmarket/ssl/` directory.

Hint: To login as the JoinMarket user, you can ssh into your RaspiBlitz, type `jm`, and exit the JoininBox menu.

Create the SSL directory:

```bash
(jmvenv) joinmarket@raspberrypi:~ $ mkdir ~/.joinmarket/ssl/
```

Generate the certificate and associated key:

```bash
openssl req -newkey rsa:4096 -x509 -sha256 -days 3650 -nodes -out ~/.joinmarket/ssl/cert.pem -keyout ~/.joinmarket/ssl/key.pem
```

Hint: You don't have to enter anything meaningful, you can just hit the return key a couple of times.

3. Start the JoinMarket API service:

```bash
(jmvenv) joinmarket@raspberrypi:~/joinmarket-clientserver/scripts $ python jmwalletd.py
```

You should see the following:

```text
2021-11-18 18:16:57,639 [INFO]  Starting jmwalletd on port: 28183
2021-11-18 18:16:57,661 [INFO]  Joinmarket daemon listening on port 27183
```

4. Create an ssh tunnel for the API service. As the `joinmarket` user, add the following lines to your `~/.ssh/config` file:

```conf
Host raspiblitz
  HostName 192.168.X.X # (IP address of your RaspiBlitz)
  User admin
  ForwardAgent yes
  LocalForward 28183 localhost:28183
```

### Download and install the app

In short:

```bash
git clone https://github.com/joinmarket-webui/joinmarket-webui.git
cd joinmarket-webui
npm install && npm start
```
