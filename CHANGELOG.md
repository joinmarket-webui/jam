# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [0.0.4](https://github.com/joinmarket-webui/joinmarket-webui/compare/v0.0.3...v0.0.4) (2022-03-10)

#### Fixed

* add bottom spacing to onboarding screen ([#128](https://github.com/joinmarket-webui/joinmarket-webui/issues/128)) ([7fb425f](https://github.com/joinmarket-webui/joinmarket-webui/commit/7fb425fd483bef8fedd95f151c93507f82f86652))
* address copy button on http sites ([#165](https://github.com/joinmarket-webui/joinmarket-webui/issues/165)) ([34f8d2d](https://github.com/joinmarket-webui/joinmarket-webui/commit/34f8d2dc2b2fb50def6ed3e316e50db769f84154))
* clear UI wallet if locking fails with status 401 ([#158](https://github.com/joinmarket-webui/joinmarket-webui/issues/158)) ([13f0ac3](https://github.com/joinmarket-webui/joinmarket-webui/commit/13f0ac380383e1c48ec1178890f6fe8cf1e59bc2))
* display message if utxos are empty ([#166](https://github.com/joinmarket-webui/joinmarket-webui/issues/166)) ([514bc5a](https://github.com/joinmarket-webui/joinmarket-webui/commit/514bc5a96d7a4ae175c63f0ca4b1c5bfe2fa1e0a))
* fix tests after rename of app to Jam ([#148](https://github.com/joinmarket-webui/joinmarket-webui/issues/148)) ([57a563e](https://github.com/joinmarket-webui/joinmarket-webui/commit/57a563e97c4746f9047754cae0eb4d6a63fa7deb))
* page reloads ([#162](https://github.com/joinmarket-webui/joinmarket-webui/issues/162)) ([78d15a1](https://github.com/joinmarket-webui/joinmarket-webui/commit/78d15a1a30c5bc755085820bbd85d02056c78eeb))
* react classname markup ([#123](https://github.com/joinmarket-webui/joinmarket-webui/issues/123)) ([d4c7a49](https://github.com/joinmarket-webui/joinmarket-webui/commit/d4c7a49d5daa903a50798f589f3339587a1ff5e8))
* set state on mounted component only ([#125](https://github.com/joinmarket-webui/joinmarket-webui/issues/125)) ([198a741](https://github.com/joinmarket-webui/joinmarket-webui/commit/198a741a4e842dc321e23605ffc2af0797dab9e0))
* suggest number of collaborators based on configured minimum ([#116](https://github.com/joinmarket-webui/joinmarket-webui/issues/116)) ([d2c36bf](https://github.com/joinmarket-webui/joinmarket-webui/commit/d2c36bfc65311163f05c7415993a09c5d5131f82))
* update suggested number of collaborators ([#150](https://github.com/joinmarket-webui/joinmarket-webui/issues/150)) ([26ffe8c](https://github.com/joinmarket-webui/joinmarket-webui/commit/26ffe8cdeb2146a757c90d05b67d3304485af918))
* use own qrcode component to display addresses ([#146](https://github.com/joinmarket-webui/joinmarket-webui/issues/146)) ([87299b3](https://github.com/joinmarket-webui/joinmarket-webui/commit/87299b3268fbcb3710ce81cf3db8419325994138))
* use resolvedLanguage in language picker ([#168](https://github.com/joinmarket-webui/joinmarket-webui/issues/168)) ([b38f7e8](https://github.com/joinmarket-webui/joinmarket-webui/commit/b38f7e840e62a9685685469c514bedfc75da65d5))
* warn on missing config vars ([#152](https://github.com/joinmarket-webui/joinmarket-webui/issues/152)) ([3180103](https://github.com/joinmarket-webui/joinmarket-webui/commit/3180103da67f70dfd2030cc9db403d30a58a1b4a))

#### Added

* add display seed phrase option to settings ([#160](https://github.com/joinmarket-webui/joinmarket-webui/issues/160)) ([7fb76ff](https://github.com/joinmarket-webui/joinmarket-webui/commit/7fb76ff5d54a03e3ef0763e94f3f10bc3e73c503))
* allow for deployment in subdirectory ([#124](https://github.com/joinmarket-webui/joinmarket-webui/issues/124)) ([4a3b168](https://github.com/joinmarket-webui/joinmarket-webui/commit/4a3b16847e71a79e8b0b57ccf20c2edb0df5bf98))
* allow for deployment in subdirectory ([#129](https://github.com/joinmarket-webui/joinmarket-webui/issues/129)) ([c022c20](https://github.com/joinmarket-webui/joinmarket-webui/commit/c022c205bbc3d428262ab66e1cc264885907f445))
* i18n ([#153](https://github.com/joinmarket-webui/joinmarket-webui/issues/153)) ([cc168eb](https://github.com/joinmarket-webui/joinmarket-webui/commit/cc168eb49faf7495bc653ff104f6cac1c090dbbe))
* readd websocket connection ([#122](https://github.com/joinmarket-webui/joinmarket-webui/issues/122)) ([03e58c9](https://github.com/joinmarket-webui/joinmarket-webui/commit/03e58c905977138c0dbca740111706f801be2b02))
* remove privacy levels on receive screen in magic mode ([#141](https://github.com/joinmarket-webui/joinmarket-webui/issues/141)) ([1852eca](https://github.com/joinmarket-webui/joinmarket-webui/commit/1852eca5c964d2ffd6852015a7ae9f65883f9b47))

### [0.0.3](https://github.com/joinmarket-webui/joinmarket-webui/compare/v0.0.2...v0.0.3) (2022-02-18)

#### Fixed

* display info text on send page if service is running ([#86](https://github.com/joinmarket-webui/joinmarket-webui/issues/86)) ([4070d70](https://github.com/joinmarket-webui/joinmarket-webui/commit/4070d7026c0ba7eac7fca02a3c14c65da510f67b))
* fix and dry up font features ([#98](https://github.com/joinmarket-webui/joinmarket-webui/issues/98)) ([ac762c5](https://github.com/joinmarket-webui/joinmarket-webui/commit/ac762c520486e33fc493b3de59ad8b02f6aa5332))
* improve onboarding mobile layout ([#109](https://github.com/joinmarket-webui/joinmarket-webui/issues/109)) ([4159fac](https://github.com/joinmarket-webui/joinmarket-webui/commit/4159fac2303233faa93c57c2e2cec9faa3b8fbd6))
* navigate to root on unmapped path ([#89](https://github.com/joinmarket-webui/joinmarket-webui/issues/89)) ([6f0f515](https://github.com/joinmarket-webui/joinmarket-webui/commit/6f0f515e87c177c8e5bf71009782497f779eac83))
* update sat symbol ([#36](https://github.com/joinmarket-webui/joinmarket-webui/issues/36)) ([765c9d7](https://github.com/joinmarket-webui/joinmarket-webui/commit/765c9d7315f96843cefeddbe51b49682f652ea2a))

#### Added

* ability for reverse proxy to enforce own auth scheme ([#102](https://github.com/joinmarket-webui/joinmarket-webui/issues/102)) ([5b7fc98](https://github.com/joinmarket-webui/joinmarket-webui/commit/5b7fc982e5241219e5f43fd5cd77f1d9a65abbfe))
* add connection indicator to footer ([#55](https://github.com/joinmarket-webui/joinmarket-webui/issues/55)) ([6470ab4](https://github.com/joinmarket-webui/joinmarket-webui/commit/6470ab431627c091a40016b9baa2516157ca5ba2))
* add privacy levels ([#51](https://github.com/joinmarket-webui/joinmarket-webui/issues/51)) ([7546ca7](https://github.com/joinmarket-webui/joinmarket-webui/commit/7546ca74d44369c4d8dba6961b4d441bd98edb09))
* add quick hide balance ([#106](https://github.com/joinmarket-webui/joinmarket-webui/issues/106)) ([56b4d1e](https://github.com/joinmarket-webui/joinmarket-webui/commit/56b4d1e64f51dbe243d5b9877800c94caa5f0fa9))
* add sat symbol & update balance UI ([#11](https://github.com/joinmarket-webui/joinmarket-webui/issues/11)) ([4351d13](https://github.com/joinmarket-webui/joinmarket-webui/commit/4351d1380e3a3d7ba872dce1f2281d192ad095ec))
* add settings screen ([#26](https://github.com/joinmarket-webui/joinmarket-webui/issues/26)) ([867fff3](https://github.com/joinmarket-webui/joinmarket-webui/commit/867fff330bac37c4c741ca528e7f9ffa0511d2fd))
* add theming support ([#10](https://github.com/joinmarket-webui/joinmarket-webui/issues/10)) ([d7268aa](https://github.com/joinmarket-webui/joinmarket-webui/commit/d7268aa70c54fa08a094b0e4c1e8eb2c88e00c77))
* developer docs ([#37](https://github.com/joinmarket-webui/joinmarket-webui/issues/37)) ([d843770](https://github.com/joinmarket-webui/joinmarket-webui/commit/d84377071a87c2011b5fe1bc957243f491f66cfd))
* display basic yield generator report ([#73](https://github.com/joinmarket-webui/joinmarket-webui/issues/73)) ([b37de70](https://github.com/joinmarket-webui/joinmarket-webui/commit/b37de7083ecb9575d798a2df2aa69a6d21dba0a0))
* freeze/unfreeze utxos ([#110](https://github.com/joinmarket-webui/joinmarket-webui/issues/110)) ([2c2d228](https://github.com/joinmarket-webui/joinmarket-webui/commit/2c2d22875422771ffc2962f584ba60db78c8398d))
* hide sensitive info on wallet create ([#77](https://github.com/joinmarket-webui/joinmarket-webui/issues/77)) ([174726b](https://github.com/joinmarket-webui/joinmarket-webui/commit/174726b74fd889980c124b9d56e2c1d1766e8a2f))
* update create wallet flow ([#62](https://github.com/joinmarket-webui/joinmarket-webui/issues/62)) ([8ed27ae](https://github.com/joinmarket-webui/joinmarket-webui/commit/8ed27ae745f46ffda246006b5f7ba549493aa39b))
* update earn page ([#82](https://github.com/joinmarket-webui/joinmarket-webui/issues/82)) ([7d62a38](https://github.com/joinmarket-webui/joinmarket-webui/commit/7d62a3820a83103a691633c8030bc26312e8310d))
* update receive page ([#85](https://github.com/joinmarket-webui/joinmarket-webui/issues/85)) ([756d8e8](https://github.com/joinmarket-webui/joinmarket-webui/commit/756d8e8a93185933d0a92713f92bf92f7ccdf664))
* update send page ([#76](https://github.com/joinmarket-webui/joinmarket-webui/issues/76)) ([0d71915](https://github.com/joinmarket-webui/joinmarket-webui/commit/0d71915180dafb03ce69c8ba82c3c76fa5b2db46))
* update wallets page ([#108](https://github.com/joinmarket-webui/joinmarket-webui/issues/108)) ([68e7a7f](https://github.com/joinmarket-webui/joinmarket-webui/commit/68e7a7fab85015efcdbcebad38c0e04ceb2024fc), [#64](https://github.com/joinmarket-webui/joinmarket-webui/issues/64)) ([f900344](https://github.com/joinmarket-webui/joinmarket-webui/commit/f90034454920fb77ddb7fedcbe3e92f1bb994322))

### [0.0.2](https://github.com/joinmarket-webui/joinmarket-webui/compare/v0.0.1...v0.0.2) (2022-02-16)

#### Fixed

* remove displayed artifact on missing fidelity bonds ([#2](https://github.com/joinmarket-webui/joinmarket-webui/pull/2)) ([17d5afa](https://github.com/joinmarket-webui/joinmarket-webui/commit/17d5afaa578b6390a27a1d195dd31523f5228546))

### [0.0.1](https://github.com/joinmarket-webui/joinmarket-webui/compare/2b9704d...v0.0.1) (2022-02-16)

#### Added

* fork [JoinMarket-Org/jm-web-client](https://github.com/JoinMarket-Org/jm-web-client) ([79e90ea](https://github.com/joinmarket-webui/joinmarket-webui/commit/79e90eadaa772689d30bbc7e9107887dad331183))
* refactor app ([a72e0a9](https://github.com/joinmarket-webui/joinmarket-webui/commit/a72e0a97c1d4c425f8ad1d6f928f985d464aa59d))
* UI updates ([c838a7b](https://github.com/joinmarket-webui/joinmarket-webui/commit/c838a7b9dab915c8a20655f63430837ecea4f290))
