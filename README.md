<div align="center">
  <img src="docs/assets/readme-header-dark.svg#gh-light-mode-only">
  <img src="docs/assets/readme-header-light.svg#gh-dark-mode-only">
</div>

<p align="center">
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

Jam is a web UI for [JoinMarket](https://github.com/JoinMarket-Org/joinmarket-clientserver/) with a focus on user-friendliness.
It aims to provide sensible defaults and be easy to use for beginners while still providing the features advanced users expect.

- 💬 Join our [Telegram group](https://t.me/JoinMarketWebUI).
- 📚 Check out the [Wiki](https://github.com/joinmarket-webui/joinmarket-webui/wiki) for resources such as meeting notes, call recordings, ideas, and discussions.

This project builds upon work done by [Shobhitaa](https://github.com/shobhitaa), [Abhishek](https://github.com/abhishek0405), and [Adam](https://github.com/AdamISZ) (waxwing) himself: [JoinMarket-Org/jm-web-client](https://github.com/JoinMarket-Org/jm-web-client).

## 📸

<div align="center">
  <img src="docs/assets/screenshot-light.png#gh-light-mode-only" width="80%">
  <img src="docs/assets/screenshot-dark.png#gh-dark-mode-only" width="80%">
</div>

## 📦 Integrations

We're aiming to make Jam available for different node systems.
If your node of choice is missing, feel free to integrate it and let us know so we can add it here.

### [RaspiBlitz](https://github.com/rootzoll/raspiblitz)

The alpha version of Jam is [available as CLI install in RaspiBlitz v1.7.2](https://github.com/rootzoll/raspiblitz/pull/2747). To install it, exit the Raspiblitz menu and run:

```sh
config.scripts/bonus.joinmarket-webui.sh on
```

To get information on how to connect to the JoinMarket Web UI run:

```sh
config.scripts/bonus.joinmarket-webui.sh menu
```

We're aiming for a more stable version to be available as a one-click app install with [RaspiBlitz v1.8.0](https://github.com/rootzoll/raspiblitz/issues/2891).

### [Umbrel](https://getumbrel.com/)

Umbrel integration is [work in progress](https://github.com/getumbrel/umbrel/pull/1216).

### [Citadel](https://runcitadel.space/)

Citadel integration is [work in progress](https://github.com/runcitadel/apps/pull/9).

## 🍊 Features

- [x] Spending from the wallet
- [x] Spending from the wallet via collaborative transactions
- [x] Running the yield generator
- [ ] [TBD](https://t.me/JoinMarketWebUI)

## 🧑‍💻 Participating

This is a [free](https://www.gnu.org/licenses/license-list.html#Expat) and [open-source](https://opensource.org/licenses/MIT) software project and we love receiving pull-requests, bug reports, ideas, and feedback from everyone.
See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started participating in this project.

### Developing

See [docs/developing.md](docs/developing.md) for additional developer docs.

## 💻 Running Locally

See [docs/developing.md](docs/developing.md#running-the-webui-locally-and-connecting-to-a-remote-joinmarket-instance) for how to run Jam locally and connect it to a JoinMarket instance.
