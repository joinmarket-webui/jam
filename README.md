<div align="center">
  <br />
  <img src="readme-header.svg" width="80%" alt="JoinMarket Web UI" />
  <br />
</div>

<h1 align="center" style="font-weight: bold !important">JoinMarket Web UI</h1>

<p align="center">
  Top-notch privacy for your bitcoin. <br>
  <strong>⚠️ This is still work in progress. Use with caution. ⚠️</strong>
</p>

<h3 align="center">
  <a href="#-integrations">Integrations</a>
  <span> · </span>
  <a href="#-features">Features</a>
  <span> · </span>
  <a href="#-installation">Installation</a>
  <span> · </span>
  <a href="#-development">Development</a>
</h3>

---

A web UI for [JoinMarket](https://github.com/JoinMarket-Org/joinmarket-clientserver/) with a focus on user-friendliness.
The UI aims to provide sensible defaults and be easy to use for beginners while still providing the features advanced users expect.

- 💬 Join our [Telegram group](https://t.me/JoinMarketWebUI).
- 📚 Check out the [Wiki](https://github.com/joinmarket-webui/joinmarket-webui/wiki) for resources such as meeting notes, call recordings, ideas, and discussions.

This project builds upon work done by [Shobhitaa](https://github.com/shobhitaa), [Abhishek](https://github.com/abhishek0405), and [Adam](https://github.com/AdamISZ) (waxwing) himself: [JoinMarket-Org/jm-web-client](https://github.com/JoinMarket-Org/jm-web-client).

## 📦 Integrations

We're aiming to make the JoinMarket Web UI available for different node systems.
If your node of choice is missing, feel free to integrate it and let us know so we can add it here.

- [**RaspiBlitz**](https://github.com/rootzoll/raspiblitz): A beta version of the JoinMarket Web UI will be [available in RaspiBlitz v1.7.2](https://github.com/rootzoll/raspiblitz/pull/2747). We're aiming for a production ready version to be available with [RaspiBlitz v1.8.0](https://github.com/rootzoll/raspiblitz/pull/2747#issuecomment-1013866678).
- [**Citadel**](https://runcitadel.space/): Citadel integration is work in progress.
- [**Umbrel**](https://getumbrel.com/): Umbrel integration is work in progress.

## ✨ Features

- [x] Spending from the wallet without Coinjoin
- [x] Simple CoinJoins
- [x] Running the yield generator
- [ ] TBD

## 👩‍🔧 Installation

These instructions assume you want to run the web UI locally and connect it to a JoinMarket instance on your RaspiBlitz.
See [Development](#-development)</a> for setting up a regtest development environment.

### 🚨 Prerequisite: JoinMarket on RaspiBlitz

To run the web UI locally you need to connect it to a running JoinMarket instance.

#### 1. JoininBox

Install [JoininBox](https://github.com/openoms/joininbox) on your [RaspiBlitz](https://github.com/rootzoll/raspiblitz):

```
Services > j [BTC JoinMarket+JoininBox menu]
```

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

Start the JoinMarket API service:

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

### 💻 Download and Install the Web UI

In short:

```bash
git clone https://github.com/joinmarket-webui/joinmarket-webui.git
cd joinmarket-webui
npm install && npm start
```
