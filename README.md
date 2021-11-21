# Web client for joinmarket

There is a Web UI prototype, written in React, which has some initial functionality. The prototype builts upon work done by [Shobhitaa](https://github.com/shobhitaa), [Abhishek](https://github.com/abhishek0405), and [Adam](https://github.com/AdamISZ) (waxwing) himself. The screenshots below are from commit [ba26cf637076444c7fadc82f6538eee5bd3b796a](https://github.com/joinmarket-webui/jm-web-client/commit/ba26cf637076444c7fadc82f6538eee5bd3b796a).

GitHub repository: [JoinMarket-Org/jm-web-client](https://github.com/JoinMarket-Org/jm-web-client)

![Wallet Screen (prototype)](https://i.imgur.com/fXu8zqf.png)

## RaspiBlitz Setup

While this prototype will hopefully be available as a packaged version soon, here is how you can set it up and play around with it yourself.

### Prerequisite: RaspiBlitz with JoinMarket

1. Install [JoininBox](https://github.com/openoms/joininbox) on your [RaspiBlitz](https://github.com/rootzoll/raspiblitz):

You can install it via the RaspiBlitz Services menu: ```Services > j [BTC JoinMarket+JoininBox menu]```

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
git checkout next
cd joinmarket
yarn && yarn start
```

You might have to install yarn via `npm install -g yarn`.

Note: The above steps will soon change, as soon as [this PR](https://github.com/JoinMarket-Org/jm-web-client/pull/12) is merged.

In any case, if everything works, you should be greeted with the following screen, assuming you have a wallet set up in JoinMarket:

![Unlock Wallet (prototype)](https://i.imgur.com/drrHaLH.png)
