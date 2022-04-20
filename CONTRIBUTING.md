# Contributing to This Project

This is a [free](https://www.gnu.org/licenses/license-list.html#Expat) and [open-source](https://opensource.org/licenses/MIT) software project and we love receiving pull-requests, bug reports, ideas, and feedback from everyone.
The aim of this document is to help you get setup for participating in all areas of this project quickly—whether that's submitting code via a pull request, testing the latest iteration, reporting issues, writing documentation, etc.

## Understanding the Components Involved

Jam is a web UI for [JoinMarket](https://github.com/JoinMarket-Org/joinmarket-clientserver/) with focus on user-friendliness.
The web UI's purpose is to be a rather lightweight front end for the JoinMarket API.
To function, the web UI needs to connect to an instance of JoinMarket with [the API service](https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/JSON-RPC-API-using-jmwalletd.md) running.

You don't need to worry about that, though.
To ease development and testing, we provide a Docker setup that runs JoinMarket and its API service in a regtest setup.
It isn't needed to dig deeper into how it works to use it.
However, if you want to find out more about it, see [docker/regtest/readme.md](docker/regtest/readme.md).

## Submitting a Pull Request

[Fork](https://github.com/joinmarket-webui/joinmarket-webui/fork), then clone this repo:

```sh
git clone git@github.com:<your-username>/joinmarket-webui.git
```

Start the JoinMarket HTTP API service in regtest:

```sh
docker-compose --file docker/regtest/docker-compose.yml up
```

Initialize the regtest setup. This creates and funds a wallet `funded` with password `test`.

```sh
docker/regtest/init-setup.sh
```

Install dependencies:

```sh
npm install
```

Start the UI on port 3000:

```sh
npm start
```

Make your changes and be sure to manually test them before submitting them to us.

Once you're sure the changes work well, push to your fork and [submit a pull request](https://github.com/joinmarket-webui/joinmarket-webui/compare/).
We will try to at least comment on your pull request within a couple of days. We may suggest some changes, improvements, or alternatives.

Some things that will increase the chance that your pull request is accepted:

- Make sure the changes work well and cover edge cases.
- Make sure your code is formatted. This should happen automatically using a Git commit-hook. If not, see [docs/developing.md](docs/developing.md) for more details.
- Write a meaningful pull request description message.

If your pull request is accepted, a maintainer will squash it into master.
We follow the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) convention when squashing pull requests to master.
You can follow this convention for commits on your fork but this isn't a requirement for your pull request to be accepted.

## Testing the Latest Iteration

Clone this repo:

```sh
git clone git@github.com:joinmarket-webui/joinmarket-webui.git
```

Checkout the version you want to test. If you want to test the cutting edge development version, simply skip this step and test directly on master.

```sh
git fetch --tags git checkout <version>
```

Start the JoinMarket HTTP API service in regtest:

```sh
docker-compose --file docker/regtest/docker-compose.yml up
```

Initialize the regtest setup. This creates and funds a wallet `funded` with password `test`.

```sh
docker/regtest/init-setup.sh
```

Install dependencies:

```sh
npm install
```

Start the UI on port 3000:

```sh
npm start
```

Enjoy the test drive!

## Reporting Issues

Reporting an issue is as easy as [opening one on GitHub](https://github.com/joinmarket-webui/joinmarket-webui/issues/new).
Be sure to provide a detailed description of what you think is wrong and add as much context as possible.
If applicable, include step-by-step instruction on how to reproduce the issue.
Before you submit an issue, please have a quick look at the [currently open issues](https://github.com/joinmarket-webui/joinmarket-webui/issues).
You might find that another person has already reported the same thing.
