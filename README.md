# Web client for joinmarket

There is a Web UI prototype, written in React, which has some initial functionality. The prototype builts upon work done by [Shobhitaa](https://github.com/shobhitaa), [Abhishek](https://github.com/abhishek0405), and [Adam](https://github.com/AdamISZ) (waxwing) himself. The screenshots below are from commit [ba26cf637076444c7fadc82f6538eee5bd3b796a](https://github.com/joinmarket-webui/jm-web-client/commit/ba26cf637076444c7fadc82f6538eee5bd3b796a).

GitHub repository: [JoinMarket-Org/jm-web-client](https://github.com/JoinMarket-Org/jm-web-client)

![Wallet Screen (prototype)](https://i.imgur.com/fXu8zqf.png)

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

## RaspiBlitz Setup

While this prototype will hopefully be available as a packaged version soon, here is how you can set it up and play around with it yourself.

### Prerequisite: RaspiBlitz with JoinMarket

1. Install [JoininBox](https://github.com/openoms/joininbox) on your [RaspiBlitz](https://github.com/rootzoll/raspiblitz):

You can install it via the RaspiBlitz Services menu: ```Services > j [BTC JoinMarket+JoininBox menu]```

This prototype makes use of the JoinMarket [RPC API](https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/996).
For this, you will need JoinMarket [version 0.9.3](https://github.com/JoinMarket-Org/joinmarket-clientserver/releases/tag/v0.9.3) or higher.
If needed you can upgrade JoinMarket to the latest commit via the JoininBox menu on your RaspiBlitz: Type `jm` in the command line and select ```UPDATE > ADVANCED > JMCOMMIT```.
This will install the latest development version from JoinMarket's master branch.

### Prerequisite: JoinMarket API Service

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

### Download and Install the Prototype

In short:

```bash
git clone https://github.com/joinmarket-webui/jm-web-client.git
cd jm-web-client
npm install && npm start
```

In any case, if everything works, you should be greeted with the following screen, assuming you have a wallet set up in JoinMarket:

![Unlock Wallet (prototype)](https://i.imgur.com/drrHaLH.png)
