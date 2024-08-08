# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1](https://github.com/joinmarket-webui/jam/compare/v0.2.0...v0.2.1) (2024-07-21)

#### Added

* **config:** ability to customize "max sweep fee change" setting ([#793](https://github.com/joinmarket-webui/jam/issues/793)) ([b4f8a56](https://github.com/joinmarket-webui/jam/commit/b4f8a56baa5e1f4bbad1cd437a3f08172d9db026))
* display warning on fidelity bond with same expiry date ([#741](https://github.com/joinmarket-webui/jam/issues/741)) ([c04007d](https://github.com/joinmarket-webui/jam/commit/c04007d2968dd587f6fdc0d85798412c2d892f97))
* **earn:** add simple stats to earn report ([#731](https://github.com/joinmarket-webui/jam/issues/731)) ([24a9026](https://github.com/joinmarket-webui/jam/commit/24a9026a24579ba8ba5e99117b58dc6c31c3c3bc))
* **orderbook:** show fidelity bond value and locktime ([#766](https://github.com/joinmarket-webui/jam/issues/766)) ([3bcbdee](https://github.com/joinmarket-webui/jam/commit/3bcbdeed191486047ae58913d9017f58b88245a4))
* validate mnemonic phrase against BIP39 wordlist ([#739](https://github.com/joinmarket-webui/jam/issues/739)) ([69e8fa7](https://github.com/joinmarket-webui/jam/commit/69e8fa7f1218fffb83d1c372d39c2264de909b63))

#### Fixed

* allow absolute maker fee of zero ([#727](https://github.com/joinmarket-webui/jam/issues/727)) ([c04a830](https://github.com/joinmarket-webui/jam/commit/c04a8304dbbce6a2dbfdfbada22317a97815dc3e))
* **Earn:** validate offer minsize ([#745](https://github.com/joinmarket-webui/jam/issues/745)) ([7aef192](https://github.com/joinmarket-webui/jam/commit/7aef192e72de95c8cc3b20e0a76f369e98208318))
* **fb:** display error alert in modal  ([fef6260](https://github.com/joinmarket-webui/jam/commit/fef6260be03d1fe0bf65e1b6fafb8f10dbf8d2af))

## [0.2.0](https://github.com/joinmarket-webui/jam/compare/v0.1.6...v0.2.0) (2024-02-24)

#### Fixed

* **fee-randomization:** fix fee range in PaymentConfirmModal ([#655](https://github.com/joinmarket-webui/jam/issues/655)) ([31f54c8](https://github.com/joinmarket-webui/jam/commit/31f54c8cb8bf1474406328be7c5a26b5b5263a44))
* selectable ui elements ([#714](https://github.com/joinmarket-webui/jam/issues/714)) ([378daf5](https://github.com/joinmarket-webui/jam/commit/378daf5c936b56a401deeefb9d847bf2ed14f7c7))
* show warning on missing fee config values ([#674](https://github.com/joinmarket-webui/jam/issues/674)) ([5900a8c](https://github.com/joinmarket-webui/jam/commit/5900a8c6209aac9d1113186616f72efe023fa3c4))
* **ui:** adapt payment confirm size ([#712](https://github.com/joinmarket-webui/jam/issues/712)) ([11e2c2a](https://github.com/joinmarket-webui/jam/commit/11e2c2a88c8dc95bd47e64b0f315213ddd355ca6))
* use orderbook.json instead of parsing html table ([#687](https://github.com/joinmarket-webui/jam/issues/687)) ([df81804](https://github.com/joinmarket-webui/jam/commit/df8180432be414840b71ea970eef42316c085941))

#### Added

* align amount input fields ([#711](https://github.com/joinmarket-webui/jam/issues/711)) ([7006e57](https://github.com/joinmarket-webui/jam/commit/7006e575f48c62d761dafe08e0fc2317e2e6c1b4))
* check for existing wallet ([#720](https://github.com/joinmarket-webui/jam/issues/720)) ([ac383dc](https://github.com/joinmarket-webui/jam/commit/ac383dcdd8f3bee4e63e3236537c5e945c2edd69))
* custom tx fee on direct and collaborative send ([#706](https://github.com/joinmarket-webui/jam/issues/706)) ([dc95e64](https://github.com/joinmarket-webui/jam/commit/dc95e646e7095d0ae8e0a312830455fc81e1a6bc))
* display ui/backend version ([#668](https://github.com/joinmarket-webui/jam/issues/668)) ([69e61e0](https://github.com/joinmarket-webui/jam/commit/69e61e06c135549c1812f20456c9cbbd46853e2b))
* renew fidelity bond ([#678](https://github.com/joinmarket-webui/jam/issues/678)) ([b4948ef](https://github.com/joinmarket-webui/jam/commit/b4948ef9f013c6e127251d85def0096e9d4f21f2))
* **ui:** autofocus next input when confirming seed phrase backup ([#718](https://github.com/joinmarket-webui/jam/issues/718)) ([27e687c](https://github.com/joinmarket-webui/jam/commit/27e687c9cf34fdd1f92b8c675c6579b4759f9389))

### [0.1.6](https://github.com/joinmarket-webui/jam/compare/v0.1.5...v0.1.6) (2023-09-22)

#### Fixed

* typo on orderbook page ([#661](https://github.com/joinmarket-webui/jam/issues/661)) ([a0fa434](https://github.com/joinmarket-webui/jam/commit/a0fa434eabea269e87b1e1786e9144a07d893269))
* **ui:** consistent button styles ([#656](https://github.com/joinmarket-webui/jam/issues/656)) ([a559e1e](https://github.com/joinmarket-webui/jam/commit/a559e1e92c9e245a48f1e698c109b8f039e9b443))

#### Added

* backend version based feature toggles ([#647](https://github.com/joinmarket-webui/jam/issues/647)) ([6b45718](https://github.com/joinmarket-webui/jam/commit/6b457187593a37d34faf23e6d4898cb2a7fb59b7))
* **balance:** display frozen balance on jars ([#635](https://github.com/joinmarket-webui/jam/issues/635)) ([b029c92](https://github.com/joinmarket-webui/jam/commit/b029c923823e6f9f441289f61b39c2d83b5bb983))
* **i18n:** add Chinese translation (zh-Hans and zh-Hant) ([#628](https://github.com/joinmarket-webui/jam/issues/628)) ([550a435](https://github.com/joinmarket-webui/jam/commit/550a43588b1b003a52a4ed3ba00b4623b9e7dd1d))
* **i18n:** add Italian translation (it)  ([#627](https://github.com/joinmarket-webui/jam/issues/627)) ([068042f](https://github.com/joinmarket-webui/jam/commit/068042fceb5ff192b99bbf479bd1a225d52d1b61))
* **i18n:** adding translation in Brazilian Portuguese (pt-BR) ([#615](https://github.com/joinmarket-webui/jam/issues/615)) ([4d9171e](https://github.com/joinmarket-webui/jam/commit/4d9171e15fe45100dd26db621576739af9b7e012))
* **i18n:** update german translation (de) ([#659](https://github.com/joinmarket-webui/jam/issues/659)) ([8b54f28](https://github.com/joinmarket-webui/jam/commit/8b54f28644fc04c58716102d3bcc6583e32b104a))
* **i18n:** update to Chinese translations ([#660](https://github.com/joinmarket-webui/jam/issues/660)) ([c40938a](https://github.com/joinmarket-webui/jam/commit/c40938a2fab147695a03ef58ff0692bdd9fc1354))
* import wallet ([#621](https://github.com/joinmarket-webui/jam/issues/621)) ([028f321](https://github.com/joinmarket-webui/jam/commit/028f32166a21778796dd10e2d1d7fbce5e07ed8f))
* **Send:** Fee breakdown table ([#606](https://github.com/joinmarket-webui/jam/issues/606)) ([7a6b920](https://github.com/joinmarket-webui/jam/commit/7a6b920fd2f145b9e47f29ef0f27a2786bb87525))

### [0.1.5](https://github.com/joinmarket-webui/jam/compare/v0.1.4...v0.1.5) (2023-02-08)

#### Fixed

* construct dates with timestamp to please safari ([#584](https://github.com/joinmarket-webui/jam/issues/584)) ([9ebe168](https://github.com/joinmarket-webui/jam/commit/9ebe168b5dced4553bae942a8d8836e9b103c815))
* **fb:** correctly display success screen after unlocking fb ([#601](https://github.com/joinmarket-webui/jam/issues/601)) ([0eb6649](https://github.com/joinmarket-webui/jam/commit/0eb6649b7a21ab03824e562edec92d3080cf8e16))
* **fee:** allow input for relative fee limit of 0.0001% ([#603](https://github.com/joinmarket-webui/jam/issues/603)) ([1c87a6d](https://github.com/joinmarket-webui/jam/commit/1c87a6de06db3974a8f0e307329fc3f13dd69954))
* **fees:** allow min tx fee of 1sat/vbyte ([#604](https://github.com/joinmarket-webui/jam/issues/604)) ([4121c9b](https://github.com/joinmarket-webui/jam/commit/4121c9bd4510cef9af5345fd921d040933b915e9))
* install python3-venv in regtest environment ([#585](https://github.com/joinmarket-webui/jam/issues/585)) ([d9b0415](https://github.com/joinmarket-webui/jam/commit/d9b0415dffb397c9d602b42408916ce8daeef63c))

#### Added

* add dedicated error page ([#586](https://github.com/joinmarket-webui/jam/issues/586)) ([42c9f5d](https://github.com/joinmarket-webui/jam/commit/42c9f5d773a74a41e4f32c145c3512d7d9405d6d))
* **Jam:** add success message ([#599](https://github.com/joinmarket-webui/jam/issues/599)) ([531adb6](https://github.com/joinmarket-webui/jam/commit/531adb6ffa82183534c7e8f08c7a87d05adad59c))
* quick freeze/unfreeze utxos ([#591](https://github.com/joinmarket-webui/jam/issues/591)) ([f3f6e84](https://github.com/joinmarket-webui/jam/commit/f3f6e847abfe43db6ae6d63656d15b81122b66e2))
* Show jar total amount in detail view ([#551](https://github.com/joinmarket-webui/jam/issues/551)) ([90f22e5](https://github.com/joinmarket-webui/jam/commit/90f22e59eb317ae7280357f0c00455ae9c46bf68))

### [0.1.4](https://github.com/joinmarket-webui/jam/compare/v0.1.3...v0.1.4) (2022-12-13)

#### Fixed

* **send:** parse number of collaborators as integer ([#572](https://github.com/joinmarket-webui/jam/issues/572)) ([4fca8f1](https://github.com/joinmarket-webui/jam/commit/4fca8f1fd1ba5d9e9f7f1289c9db35c1f03aaf34))
* **performance:** speed up initial page load ([#566](https://github.com/joinmarket-webui/jam/pull/566)) ([e2bad18](https://github.com/joinmarket-webui/jam/commit/e2bad188f116b63bf68b308106bba33ac8fc7164))

#### Added

* Settings subsections ([#573](https://github.com/joinmarket-webui/jam/issues/573)) ([495dc2b](https://github.com/joinmarket-webui/jam/commit/495dc2b169ddccedb0adff3f6b9f5caf03873cbf)), closes [#524](https://github.com/joinmarket-webui/jam/issues/524)
* spend fidelity bond ([#556](https://github.com/joinmarket-webui/jam/issues/556)) ([9f42dac](https://github.com/joinmarket-webui/jam/commit/9f42dac19ad1897c51be535636ff64b8d2bbb125))

### [0.1.3](https://github.com/joinmarket-webui/jam/compare/v0.1.2...v0.1.3) (2022-11-10)

#### Fixed

* **docker**: wait for bitcoind to accept RPC calls ([#559](https://github.com/joinmarket-webui/jam/pull/559)) ([6e2ee47](https://github.com/joinmarket-webui/jam/commit/6e2ee47538fe225f7b84eb2de245993a90dfd042))
* **pagination:** colors of option element in dark mode ([#554](https://github.com/joinmarket-webui/jam/issues/554)) ([86dc2c5](https://github.com/joinmarket-webui/jam/commit/86dc2c5d545037e2a1a593049ac6b96e31910d07))

#### Added

* quickly review/adapt fee settings before sweeping ([#565](https://github.com/joinmarket-webui/jam/issues/565)) ([0d4dd0d](https://github.com/joinmarket-webui/jam/commit/0d4dd0d4d550a7052b6958326cd70adebea6cd60))
* **orderbook:** improve readability with alternating colors ([#563](https://github.com/joinmarket-webui/jam/pull/563)) ([691faf7](https://github.com/joinmarket-webui/jam/pull/563))

### [0.1.2](https://github.com/joinmarket-webui/jam/compare/v0.1.1...v0.1.2) (2022-10-28)

#### Fixed

* display error message if backend is unreachable ([#540](https://github.com/joinmarket-webui/jam/issues/540)) ([f2e346e](https://github.com/joinmarket-webui/jam/commit/f2e346e87296c53c5dee89aa4610cfeed39065b8))
* do not enable debug features on `npm start` ([#549](https://github.com/joinmarket-webui/jam/issues/549)) ([fda77c2](https://github.com/joinmarket-webui/jam/commit/fda77c202d32f32b5ca39a60f983748038cc0cf5))

### [0.1.1](https://github.com/joinmarket-webui/jam/compare/v0.1.0...v0.1.1) (2022-10-07)

#### Added

* basic fee settings ([#522](https://github.com/joinmarket-webui/jam/issues/522)) ([54dd396](https://github.com/joinmarket-webui/jam/commit/54dd3969d954112af46d746e7fcc6e78db2ef32f))
* display fee settings on Send page ([#532](https://github.com/joinmarket-webui/jam/issues/532)) ([26f911a](https://github.com/joinmarket-webui/jam/commit/26f911aea80f472d6f9484a1187e27f7dffe1ec2))
* **jar:** show sum of selected utxos ([#514](https://github.com/joinmarket-webui/jam/issues/514)) ([85d131c](https://github.com/joinmarket-webui/jam/commit/85d131cf75ba614245de450492bdde1905a6b51c))
* **send:** show txid on successful direct-send ([#510](https://github.com/joinmarket-webui/jam/issues/510)) ([13496a0](https://github.com/joinmarket-webui/jam/commit/13496a0a066bebb6f8d8b4ef72e25a00f7f347ac))

#### Fixed

* **fees:** mitigate construction of non-forwardable transactions ([#536](https://github.com/joinmarket-webui/jam/issues/536)) ([f2f3944](https://github.com/joinmarket-webui/jam/commit/f2f39444ccd59d4a5a440286a425d1b1fd7c238d))
* **navbar:** send before earn ([#507](https://github.com/joinmarket-webui/jam/issues/507)) ([c1fb2bc](https://github.com/joinmarket-webui/jam/commit/c1fb2bc68008980087581d4a0d845624f6816b85))
* **readme:** link to development heading ([0351367](https://github.com/joinmarket-webui/jam/commit/0351367e2971b9717221fa705953d444ff37c587))
* **settings:** consistent case ([#511](https://github.com/joinmarket-webui/jam/issues/511)) ([e4bd89c](https://github.com/joinmarket-webui/jam/commit/e4bd89c648ea27cd9fb4dd996248eacff0172586))
* **sweep:** reload wallet info after scheduled sweep ([#530](https://github.com/joinmarket-webui/jam/issues/530)) ([0757280](https://github.com/joinmarket-webui/jam/commit/0757280bf1d1e3b46fdf50c6bcd6268ae379714d))
* **sweep:** wait for scheduler start/stop ([#529](https://github.com/joinmarket-webui/jam/issues/529)) ([509a15e](https://github.com/joinmarket-webui/jam/commit/509a15e90a5dc58971256eab9cf7d8be1fe796ad))

## [0.1.0](https://github.com/joinmarket-webui/joinmarket-webui/compare/v0.0.10...v0.1.0) (2022-09-16)

#### Fixed

* create non-descriptor wallet ([#487](https://github.com/joinmarket-webui/joinmarket-webui/issues/487)) ([0d70415](https://github.com/joinmarket-webui/joinmarket-webui/commit/0d704158f4b41f1a1dc0adef058c13f6d6932190))
* pass api token to session request ([#456](https://github.com/joinmarket-webui/joinmarket-webui/issues/456)) ([27e1a10](https://github.com/joinmarket-webui/joinmarket-webui/commit/27e1a10f63382b757baed53e98869b3ffbd2191d))
* pass mixdepth prop as number in request body ([#457](https://github.com/joinmarket-webui/joinmarket-webui/issues/457)) ([155f9bd](https://github.com/joinmarket-webui/joinmarket-webui/commit/155f9bd55b4e385f49d49295ff52461f069f6b51))
* precondition for collaborative transactions ([#485](https://github.com/joinmarket-webui/joinmarket-webui/issues/485)) ([db29235](https://github.com/joinmarket-webui/joinmarket-webui/commit/db292356f59de24bd80622d4a1eb57414d514e49))
* proper margin for sweep button on invalid inputs ([#471](https://github.com/joinmarket-webui/joinmarket-webui/issues/471)) ([4a20c9f](https://github.com/joinmarket-webui/joinmarket-webui/commit/4a20c9fdd2eff40a2856d5c461dc4f18dba8f4f2))
* re-add Joining icon ([#474](https://github.com/joinmarket-webui/joinmarket-webui/issues/474)) ([1d0f0cc](https://github.com/joinmarket-webui/joinmarket-webui/commit/1d0f0ccf5fc5e516d6781ee041588a43b7135070))
* redirect to home if no wallet is active on route `/wallet` ([#492](https://github.com/joinmarket-webui/joinmarket-webui/issues/492)) ([2c3d6f7](https://github.com/joinmarket-webui/joinmarket-webui/commit/2c3d6f76feafd4400905dd66b5436a1fe93a0f09))
* refresh orderbook ([#462](https://github.com/joinmarket-webui/joinmarket-webui/issues/462)) ([505e960](https://github.com/joinmarket-webui/joinmarket-webui/commit/505e9606f50d13d6d2b67f1002662254f94953bd))
* reload wallet info after stopping scheduler manually ([#494](https://github.com/joinmarket-webui/joinmarket-webui/issues/494)) ([89698f2](https://github.com/joinmarket-webui/joinmarket-webui/commit/89698f27f56bb8d12894a9a9f0e6827cbf120837))
* remove jar source from scheduler options ([#465](https://github.com/joinmarket-webui/joinmarket-webui/issues/465)) ([b743357](https://github.com/joinmarket-webui/joinmarket-webui/commit/b7433571e9f3fdc3eee4acdf454cd578895b71ec))
* serialize values of `/maker/start` request body as strings ([#458](https://github.com/joinmarket-webui/joinmarket-webui/issues/458)) ([dd7943b](https://github.com/joinmarket-webui/joinmarket-webui/commit/dd7943b979d546821e1cd824e533e0b803688ce8))
* **settings:** matrix link ([#473](https://github.com/joinmarket-webui/joinmarket-webui/issues/473)) ([250f523](https://github.com/joinmarket-webui/joinmarket-webui/commit/250f523422c292232ec4db0c376d7582e29c8862))

#### Added

* ability to retrieve logs ([#478](https://github.com/joinmarket-webui/joinmarket-webui/issues/478)) ([ace3734](https://github.com/joinmarket-webui/joinmarket-webui/commit/ace3734712518bec3868d6fefc921726a5c18b76))
* abort collaborative transaction ([#497](https://github.com/joinmarket-webui/joinmarket-webui/issues/497)) ([80e40ff](https://github.com/joinmarket-webui/joinmarket-webui/commit/80e40ff51086e00e73de0fcf5cc977e8a1720cfc))
* **cheatsheet:** update order ([#496](https://github.com/joinmarket-webui/joinmarket-webui/issues/496)) ([ff50e25](https://github.com/joinmarket-webui/joinmarket-webui/commit/ff50e25c11cc4600bc98b5799af0d0db4503186c))
* click on active "joining" icon opens relevant screen ([#463](https://github.com/joinmarket-webui/joinmarket-webui/issues/463)) ([033babd](https://github.com/joinmarket-webui/joinmarket-webui/commit/033babd1ac1149343d9ef628aead754ac796208b))
* colored jars with names ([#476](https://github.com/joinmarket-webui/joinmarket-webui/issues/476)) ([6a050f4](https://github.com/joinmarket-webui/joinmarket-webui/commit/6a050f4ccc60a74bb2f7cabf4792caea2a6267f5))
* highlight own orders in orderbook ([#472](https://github.com/joinmarket-webui/joinmarket-webui/issues/472)) ([b19689d](https://github.com/joinmarket-webui/joinmarket-webui/commit/b19689de0c96b58d26931fb5cedfdd781bcc1d2b))
* **jam:** remove "keep funds in jam" ([#484](https://github.com/joinmarket-webui/joinmarket-webui/issues/484)) ([5ada591](https://github.com/joinmarket-webui/joinmarket-webui/commit/5ada5911e1c161c1f949ada5cd2c0a851df02f68))
* **navbar:** align app flow  ([#490](https://github.com/joinmarket-webui/joinmarket-webui/issues/490)) ([6322c44](https://github.com/joinmarket-webui/joinmarket-webui/commit/6322c44440e149409bfb84945f598c890d815150))
* rename "Joining" to "Jamming" ([#475](https://github.com/joinmarket-webui/joinmarket-webui/issues/475)) ([077b62a](https://github.com/joinmarket-webui/joinmarket-webui/commit/077b62ab802ebf9c94eaf12312273795f53efc67))
* **send:** warn users with send button if preconditions not met ([#498](https://github.com/joinmarket-webui/joinmarket-webui/issues/498)) ([5dd6ce6](https://github.com/joinmarket-webui/joinmarket-webui/commit/5dd6ce62d54fd2b6d8b5618ddc58bb90cacb623f))
* show active offers ([#461](https://github.com/joinmarket-webui/joinmarket-webui/issues/461)) ([c355d41](https://github.com/joinmarket-webui/joinmarket-webui/commit/c355d41f8b4420d3746116094a2be1b58a33b8fb))

### [0.0.10](https://github.com/joinmarket-webui/joinmarket-webui/compare/v0.0.9...v0.0.10) (2022-08-05)

#### Fixed

* accordion bg color ([#449](https://github.com/joinmarket-webui/joinmarket-webui/issues/449)) ([c3159a2](https://github.com/joinmarket-webui/joinmarket-webui/commit/c3159a252e55f754fbbe4a0f40fc05ddcd0b5fe2))
* cheatsheet icon ([#447](https://github.com/joinmarket-webui/joinmarket-webui/issues/447)) ([1113e21](https://github.com/joinmarket-webui/joinmarket-webui/commit/1113e21147a171a778e3439ee8df5474dce840dd))
* color of light-button in dark mode ([#442](https://github.com/joinmarket-webui/joinmarket-webui/issues/442)) ([f27a27a](https://github.com/joinmarket-webui/joinmarket-webui/commit/f27a27a93df4f070b9f308d75409290dd9357eff))
* color of selected collaborators-selector-input ([#410](https://github.com/joinmarket-webui/joinmarket-webui/issues/410)) ([a51cdbe](https://github.com/joinmarket-webui/joinmarket-webui/commit/a51cdbe53e30fc3436764f1cdd5d81c0b7cc6e0d))
* do not display freeze info when all utxos have been selected ([#420](https://github.com/joinmarket-webui/joinmarket-webui/issues/420)) ([662faf2](https://github.com/joinmarket-webui/joinmarket-webui/commit/662faf2c5523c073385a81053ff5bd861429d039))
* docs icon in settings ([#439](https://github.com/joinmarket-webui/joinmarket-webui/issues/439)) ([c4a76fa](https://github.com/joinmarket-webui/joinmarket-webui/commit/c4a76fa967365c6d39cbf974c9838c7d17163a15))
* invalid DOM property 'class' on Earn page ([#431](https://github.com/joinmarket-webui/joinmarket-webui/issues/431)) ([3d3706f](https://github.com/joinmarket-webui/joinmarket-webui/commit/3d3706f5b2df715dd20e3b03d1be034b3de6d67e))
* jar spacing ([#417](https://github.com/joinmarket-webui/joinmarket-webui/issues/417)) ([484afbc](https://github.com/joinmarket-webui/joinmarket-webui/commit/484afbc8eabee75fc8896e868ff559c479dc1380))
* remove logs ([#452](https://github.com/joinmarket-webui/joinmarket-webui/issues/452)) ([2097b35](https://github.com/joinmarket-webui/joinmarket-webui/commit/2097b35a5bd4a5cba40864e52814bc10927bfceb))
* spacing in jar overlay header and `onKeyDown` ([#421](https://github.com/joinmarket-webui/joinmarket-webui/issues/421)) ([24c0107](https://github.com/joinmarket-webui/joinmarket-webui/commit/24c01070365cbfcfc52d6cddad73d866bbbcf0dc))
* text and border colors after bootstrap update ([#432](https://github.com/joinmarket-webui/joinmarket-webui/issues/432)) ([96a401c](https://github.com/joinmarket-webui/joinmarket-webui/commit/96a401ccadaa5609c61162f739bf8eca5b5367c0))

#### Added

* ability to sort and filter orderbook ([#434](https://github.com/joinmarket-webui/joinmarket-webui/issues/434)) ([952e24b](https://github.com/joinmarket-webui/joinmarket-webui/commit/952e24b2e9e4362a05e2eba2b2b9e19c398586e9))
* add description for second fidelity bond ([#414](https://github.com/joinmarket-webui/joinmarket-webui/issues/414)) ([ad50747](https://github.com/joinmarket-webui/joinmarket-webui/commit/ad5074781831918156869bb51c6aa967b1d5c88e))
* add sorting and filtering to earn report ([#451](https://github.com/joinmarket-webui/joinmarket-webui/issues/451)) ([bd8fd97](https://github.com/joinmarket-webui/joinmarket-webui/commit/bd8fd974f565ca525ac94aa9e1f51f7592ce7f6e))
* **cheatsheet:** link to jamdocs.org ([#427](https://github.com/joinmarket-webui/joinmarket-webui/issues/427)) ([b442d58](https://github.com/joinmarket-webui/joinmarket-webui/commit/b442d58b61c8ff24f65bb6c12c295cdda195e0a1))
* **cheatsheet:** link to jamdocs.org ([#429](https://github.com/joinmarket-webui/joinmarket-webui/issues/429)) ([05c908d](https://github.com/joinmarket-webui/joinmarket-webui/commit/05c908d6f6a671e19d41021cd883cf9483dc4052))
* **cheatsheet:** re-word to remove 'yield' ([#426](https://github.com/joinmarket-webui/joinmarket-webui/issues/426)) ([893dfd0](https://github.com/joinmarket-webui/joinmarket-webui/commit/893dfd03978909ecff36a9aa0aedd084e9b1c669)), closes [#326](https://github.com/joinmarket-webui/joinmarket-webui/issues/326)
* enable orderbook for all users ([#445](https://github.com/joinmarket-webui/joinmarket-webui/issues/445)) ([2d9d13e](https://github.com/joinmarket-webui/joinmarket-webui/commit/2d9d13ea907bde1c5f49a1344fca80defcfd4b57))
* human readable locktime duration for fidelity bonds ([#450](https://github.com/joinmarket-webui/joinmarket-webui/issues/450)) ([9d8e656](https://github.com/joinmarket-webui/joinmarket-webui/commit/9d8e65698ef44b46ddf7bc4b1c32490a135781af))
* improve earn report ([#409](https://github.com/joinmarket-webui/joinmarket-webui/issues/409)) ([dc36271](https://github.com/joinmarket-webui/joinmarket-webui/commit/dc36271aa61d2790eae8fcf7b79e06cd2610a3f3))
* Orderbook ([#422](https://github.com/joinmarket-webui/joinmarket-webui/issues/422)) ([2406c04](https://github.com/joinmarket-webui/joinmarket-webui/commit/2406c04a7aad901393df7eb65dc2427587a3a8bc))
* payment confirm modal ([#446](https://github.com/joinmarket-webui/joinmarket-webui/issues/446)) ([29eca37](https://github.com/joinmarket-webui/joinmarket-webui/commit/29eca37535b026d2c3eddb87170c8345bf287bc2))
* prevent address reuse on Jam page ([#433](https://github.com/joinmarket-webui/joinmarket-webui/issues/433)) ([6a8830f](https://github.com/joinmarket-webui/joinmarket-webui/commit/6a8830f28d01aa6312dff6a53f70c7df3882f827))
* **settings:** add link to Matrix and Jam's twitter ([#436](https://github.com/joinmarket-webui/joinmarket-webui/issues/436)) ([ca3cc20](https://github.com/joinmarket-webui/joinmarket-webui/commit/ca3cc20e15c41176b2aff1fedb8f871b63764ba9))
* **settings:** add links to docs ([#437](https://github.com/joinmarket-webui/joinmarket-webui/issues/437)) ([01515d7](https://github.com/joinmarket-webui/joinmarket-webui/commit/01515d7f1432b10c5d532ac20446be720507cabd))
* show address reuse warning ([#411](https://github.com/joinmarket-webui/joinmarket-webui/issues/411)) ([b2faeb7](https://github.com/joinmarket-webui/joinmarket-webui/commit/b2faeb747613beb74060e55b15c7f701e2ff6caa))
* utxo list ([#430](https://github.com/joinmarket-webui/joinmarket-webui/issues/430)) ([61a3956](https://github.com/joinmarket-webui/joinmarket-webui/commit/61a39566f657353f4fd08851e1479724433e888a))

### [0.0.9](https://github.com/joinmarket-webui/joinmarket-webui/compare/v0.0.8...v0.0.9) (2022-07-14)

#### Fixed

* advanced wording and behavior ([#390](https://github.com/joinmarket-webui/joinmarket-webui/issues/390)) ([c25c3ce](https://github.com/joinmarket-webui/joinmarket-webui/commit/c25c3ce6259112c702e249e4af3396001f8bbe3e))
* disable 'create wallet' link when unlocking wallet ([#334](https://github.com/joinmarket-webui/joinmarket-webui/issues/334)) ([e3083b9](https://github.com/joinmarket-webui/joinmarket-webui/commit/e3083b9c8ba5a99747f588188769b954ed03f0c2))
* do not show FB create form when maker is running ([#384](https://github.com/joinmarket-webui/joinmarket-webui/issues/384)) ([e0f51fa](https://github.com/joinmarket-webui/joinmarket-webui/commit/e0f51faacbef44a3914c3f000722761362b47ee0))
* do not show expired fidelity bonds as locked ([#378](https://github.com/joinmarket-webui/joinmarket-webui/issues/378)) ([0f7d590](https://github.com/joinmarket-webui/joinmarket-webui/commit/0f7d590e352d0dd1f8dce6e55a495b789aef2d31))
* encode wallet name param in url path ([#389](https://github.com/joinmarket-webui/joinmarket-webui/issues/389)) ([a98317b](https://github.com/joinmarket-webui/joinmarket-webui/commit/a98317b34403d07ef8ca3b878e201458fcd9f8fe))
* link to new fidelity bonds form in Cheatsheet component ([#376](https://github.com/joinmarket-webui/joinmarket-webui/issues/376)) ([21757e9](https://github.com/joinmarket-webui/joinmarket-webui/commit/21757e9588a38af21304f1109cc7573155162b3b))
* pass body of confirm modal via child node ([#377](https://github.com/joinmarket-webui/joinmarket-webui/issues/377)) ([23f7383](https://github.com/joinmarket-webui/joinmarket-webui/commit/23f738355153df8f88164584bbde236426e5d30e))
* reload utxos after creating a fidelity bond ([#380](https://github.com/joinmarket-webui/joinmarket-webui/issues/380)) ([72a3e8c](https://github.com/joinmarket-webui/joinmarket-webui/commit/72a3e8cff6bfa2cc6bbbd3f6afcefe51f4830d15))

#### Added

* batch unfreeze UTXOs after creating fidelity bond ([#388](https://github.com/joinmarket-webui/joinmarket-webui/issues/388)) ([efa3361](https://github.com/joinmarket-webui/joinmarket-webui/commit/efa336117779b6f24a5165b41c9e863c85b90c7c))
* move fidelity bonds to earn screen ([#361](https://github.com/joinmarket-webui/joinmarket-webui/issues/361)) ([8608329](https://github.com/joinmarket-webui/joinmarket-webui/commit/8608329f3e45f1cc6c5cae43f8960ae01a9e147c))
* visual warning when selecting non cj-out UTXOs for fidelity bond ([#392](https://github.com/joinmarket-webui/joinmarket-webui/issues/392)) ([bad9a57](https://github.com/joinmarket-webui/joinmarket-webui/commit/bad9a5741ad15e9c8608582a99c963875ae51bfb))

### [0.0.8](https://github.com/joinmarket-webui/joinmarket-webui/compare/v0.0.7...v0.0.8) (2022-06-28)

#### Added

* **jars:** add receive shortcut if jar 0 is empty ([#344](https://github.com/joinmarket-webui/joinmarket-webui/issues/344)) ([01afb88](https://github.com/joinmarket-webui/joinmarket-webui/commit/01afb88888c173b677f4979c5ae8eef350a9da19))
* **jars:** destination jar selector on receive screen ([#346](https://github.com/joinmarket-webui/joinmarket-webui/issues/346)) ([911177c](https://github.com/joinmarket-webui/joinmarket-webui/commit/911177c899fe43fe2d889718dc644c6630629d8f))
* **jars:** destination jar selector on send screen ([#345](https://github.com/joinmarket-webui/joinmarket-webui/issues/345)) ([a08c584](https://github.com/joinmarket-webui/joinmarket-webui/commit/a08c584f5ee51fd88e5b16c862626717955c7102))

#### Fixed

* Check preconditions before send request ([#349](https://github.com/joinmarket-webui/joinmarket-webui/issues/349)) ([581184d](https://github.com/joinmarket-webui/joinmarket-webui/commit/581184d92fa4bab1054d1d6e34d7777abebe7f00))
* checked state of ToggleSwitch can be controlled by caller ([#332](https://github.com/joinmarket-webui/joinmarket-webui/issues/332)) ([c9007f5](https://github.com/joinmarket-webui/joinmarket-webui/commit/c9007f5428ae4ba79d68cd39972565a1747120e1))
* remove fidelity bond feature flag ([9fe84c8](https://github.com/joinmarket-webui/joinmarket-webui/commit/9fe84c8cda8e3959d13fa436ea9f650bf1d0b3ed))

### [0.0.7](https://github.com/joinmarket-webui/joinmarket-webui/compare/v0.0.6...v0.0.7) (2022-06-20)

#### Fixed

* loading state on Send page ([#300](https://github.com/joinmarket-webui/joinmarket-webui/issues/300)) ([db4f5ab](https://github.com/joinmarket-webui/joinmarket-webui/commit/db4f5ab18a6dcef6784c2f85adffc69a014570cc))
* mobile layout issues ([#311](https://github.com/joinmarket-webui/joinmarket-webui/issues/311)) ([8f62a42](https://github.com/joinmarket-webui/joinmarket-webui/commit/8f62a42302e40672eeeb78dc896e6116501a5905))
* prevent unnecessary session requests ([#298](https://github.com/joinmarket-webui/joinmarket-webui/issues/298)) ([bf627e7](https://github.com/joinmarket-webui/joinmarket-webui/commit/bf627e7ce128dea4679ba8e4035f578fad7a710b))
* prevent unnecessary wallet info requests ([#297](https://github.com/joinmarket-webui/joinmarket-webui/issues/297)) ([9377b33](https://github.com/joinmarket-webui/joinmarket-webui/commit/9377b33a11abbbafefbc93e0e34f2df59dd1749a))
* show balance in unit based on settings on Send screen ([#276](https://github.com/joinmarket-webui/joinmarket-webui/issues/276)) ([b0c8c4f](https://github.com/joinmarket-webui/joinmarket-webui/commit/b0c8c4f83c7e98b61be4f9a551a2b7d70c40aa43))
* styles ([#329](https://github.com/joinmarket-webui/joinmarket-webui/issues/329)) ([f5e8227](https://github.com/joinmarket-webui/joinmarket-webui/commit/f5e822743e8ad9ac0e8da77c0deb98573fcb325a))

#### Added

* add share button to receive screen ([#310](https://github.com/joinmarket-webui/joinmarket-webui/issues/310)) ([ed03476](https://github.com/joinmarket-webui/joinmarket-webui/commit/ed03476766eaf31eed4589aa25e594d13023c29d))
* basic fidelity bonds ([#307](https://github.com/joinmarket-webui/joinmarket-webui/issues/307)) ([c68e4c5](https://github.com/joinmarket-webui/joinmarket-webui/commit/c68e4c5c64c8daa1f79307adf9b0d13b5ad6704c))
* enable report overlay ([#305](https://github.com/joinmarket-webui/joinmarket-webui/issues/305)) ([69c4211](https://github.com/joinmarket-webui/joinmarket-webui/commit/69c4211b8271b9c0b2f77d74d9bf630180a50495))
* first draft of jars on main wallet screen ([#324](https://github.com/joinmarket-webui/joinmarket-webui/issues/324)) ([216100a](https://github.com/joinmarket-webui/joinmarket-webui/commit/216100a3b973f4e91dedfbd866b40d9e268cca41))
* improve wallet control in settings ([#325](https://github.com/joinmarket-webui/joinmarket-webui/issues/325)) ([9d00212](https://github.com/joinmarket-webui/joinmarket-webui/commit/9d0021287f75c1a7349363fb484ec4f36810b36d))
* make jars interactive ([#331](https://github.com/joinmarket-webui/joinmarket-webui/issues/331)) ([95b3f09](https://github.com/joinmarket-webui/joinmarket-webui/commit/95b3f09696bcfb39bc9bd94aaacf8953542d5a90))
* **navbar:** remove wallets item ([#316](https://github.com/joinmarket-webui/joinmarket-webui/issues/316)) ([da99a3e](https://github.com/joinmarket-webui/joinmarket-webui/commit/da99a3e5ea188480b4b74599a782b43e35e7e6b1)), closes [#315](https://github.com/joinmarket-webui/joinmarket-webui/issues/315)

### [0.0.6](https://github.com/joinmarket-webui/joinmarket-webui/compare/v0.0.5...v0.0.6) (2022-05-19)

#### Added

* add cheatsheet ([#211](https://github.com/joinmarket-webui/joinmarket-webui/issues/211)) ([825f725](https://github.com/joinmarket-webui/joinmarket-webui/commit/825f725053f4c11a696929516cc48f40ffc1aee5))
* add French translation ([#216](https://github.com/joinmarket-webui/joinmarket-webui/issues/216)) ([69fcbaf](https://github.com/joinmarket-webui/joinmarket-webui/commit/69fcbaff42af41f7723fd46d318009e969a5ed12))
* confirm password on Create Wallet screen ([#210](https://github.com/joinmarket-webui/joinmarket-webui/issues/210)) ([0c019db](https://github.com/joinmarket-webui/joinmarket-webui/commit/0c019db742e19efda1dab1f81f857d286c3ca1b5))
* **footer:** show Jam version ([#281](https://github.com/joinmarket-webui/joinmarket-webui/issues/281)) ([3c886f3](https://github.com/joinmarket-webui/joinmarket-webui/commit/3c886f3e05f81377f6a4b06e2ada6a020b6ce2aa))
* Individual balance toggle ([#247](https://github.com/joinmarket-webui/joinmarket-webui/issues/247)) ([e6c4cc1](https://github.com/joinmarket-webui/joinmarket-webui/commit/e6c4cc1c59925a630d0595148025ce784f3641ce))
* prevent address reuse on Jam screen ([#272](https://github.com/joinmarket-webui/joinmarket-webui/issues/272)) ([c05b431](https://github.com/joinmarket-webui/joinmarket-webui/commit/c05b431191f49718f63032d3b0fc10ee8991596d))
* rearrange order of tabs ([#258](https://github.com/joinmarket-webui/joinmarket-webui/issues/258)) ([8f527d7](https://github.com/joinmarket-webui/joinmarket-webui/commit/8f527d7be83c9326e6583fa14888be84a37ecfff))
* reload wallet data after send  ([#236](https://github.com/joinmarket-webui/joinmarket-webui/issues/236)) ([edd5818](https://github.com/joinmarket-webui/joinmarket-webui/commit/edd5818b824276dd54a03d45103c810502e496bc))
* scheduled transactions prototype ([#242](https://github.com/joinmarket-webui/joinmarket-webui/issues/242)) ([0e1d0a8](https://github.com/joinmarket-webui/joinmarket-webui/commit/0e1d0a8a692633459f53edf156c1e4446db62852))
* simple progress report for scheduled transactions ([#262](https://github.com/joinmarket-webui/joinmarket-webui/issues/262)) ([0e3b7b8](https://github.com/joinmarket-webui/joinmarket-webui/commit/0e3b7b8b9416331bda7837fc5bb39b6d9ba3e869))
* split up scheduler destination addresses over 3 mixdepths ([#283](https://github.com/joinmarket-webui/joinmarket-webui/issues/283)) ([471cbc7](https://github.com/joinmarket-webui/joinmarket-webui/commit/471cbc7e985c2521f9053e950067c781649666b9))

#### Fixed

* do not hide CreateWallet component on connection errors ([#199](https://github.com/joinmarket-webui/joinmarket-webui/issues/199)) ([963dc49](https://github.com/joinmarket-webui/joinmarket-webui/commit/963dc49e723072d91f91649610e3f733bef358d1))
* force-close pending websockets connections ([#200](https://github.com/joinmarket-webui/joinmarket-webui/issues/200)) ([33b35f7](https://github.com/joinmarket-webui/joinmarket-webui/commit/33b35f7ba9bd0f97c115172ea5918bb06d308422))
* link to dev docs on contributing page ([#224](https://github.com/joinmarket-webui/joinmarket-webui/issues/224)) ([ef23b4b](https://github.com/joinmarket-webui/joinmarket-webui/commit/ef23b4b0850c2fa1d28a0ae9b56f2f53293b296f))
* possible reference error in catch clause ([#265](https://github.com/joinmarket-webui/joinmarket-webui/issues/265)) ([2526eac](https://github.com/joinmarket-webui/joinmarket-webui/commit/2526eacf3b67307ece0a86a442094377df8c77c5))
* prevent operations when maker/taker service is running ([#218](https://github.com/joinmarket-webui/joinmarket-webui/issues/218)) ([035dd80](https://github.com/joinmarket-webui/joinmarket-webui/commit/035dd8034ab5a45ef377a17877b343132cdf933f))
* prevent starting scheduler when utxo preconditions are not met ([#263](https://github.com/joinmarket-webui/joinmarket-webui/issues/263)) ([a500b02](https://github.com/joinmarket-webui/joinmarket-webui/commit/a500b02f9bb1c11681a8ae8c532b77dfb18add6a))
* prevent starting/stopping scheduler while data is loading ([#260](https://github.com/joinmarket-webui/joinmarket-webui/issues/260)) ([593981d](https://github.com/joinmarket-webui/joinmarket-webui/commit/593981dfd3d823ad02f09bbb683a652027b5383e))
* reload session info on Earn and Wallets screen ([#231](https://github.com/joinmarket-webui/joinmarket-webui/issues/231)) ([df34272](https://github.com/joinmarket-webui/joinmarket-webui/commit/df342722c45d9c0184031a566e54fb31acae9685))
* Remove skip button quiz screen ([#198](https://github.com/joinmarket-webui/joinmarket-webui/issues/198)) ([6c5e149](https://github.com/joinmarket-webui/joinmarket-webui/commit/6c5e149516454e1008aebf5f5cef74da9309f5f6))
* reset wallet when token became invalid ([#223](https://github.com/joinmarket-webui/joinmarket-webui/issues/223)) ([70ffc99](https://github.com/joinmarket-webui/joinmarket-webui/commit/70ffc990402df242cf5c1fcc30308762ca918b8f))

### [0.0.5](https://github.com/joinmarket-webui/joinmarket-webui/compare/v0.0.4...v0.0.5) (2022-03-29)

#### Added

* add seed phrase backup confirmation during wallet creation ([#156](https://github.com/joinmarket-webui/joinmarket-webui/issues/156)) ([0719dc6](https://github.com/joinmarket-webui/joinmarket-webui/commit/0719dc62359387282363e0f3e658106d64c4051f))
* satscomma formatting for bitcoin balances ([#171](https://github.com/joinmarket-webui/joinmarket-webui/issues/171)) ([fe94945](https://github.com/joinmarket-webui/joinmarket-webui/commit/fe94945f2ae95a96f011cddf4d7a8604c1e76d2e))
* sweep mixdepths ([#184](https://github.com/joinmarket-webui/joinmarket-webui/issues/184)) ([81876b7](https://github.com/joinmarket-webui/joinmarket-webui/commit/81876b72146e2ab5c69ef52ccc183576a5929a34))
* translate screens ([#174](https://github.com/joinmarket-webui/joinmarket-webui/issues/174)) ([63018ac](https://github.com/joinmarket-webui/joinmarket-webui/commit/63018ac96b8dd743ef47cb9a9a010f773f1542e4))

#### Fixed

* make websocket health state work across browsers ([#186](https://github.com/joinmarket-webui/joinmarket-webui/issues/186)) ([39019cc](https://github.com/joinmarket-webui/joinmarket-webui/commit/39019ccbb668637b20c7220277b9b3cfcb6a7942))
* pass correct request body in send-direct request ([#180](https://github.com/joinmarket-webui/joinmarket-webui/issues/180)) ([182b09c](https://github.com/joinmarket-webui/joinmarket-webui/commit/182b09c359e492531c3be7a1ad6d91310c7c5546))

### [0.0.4](https://github.com/joinmarket-webui/joinmarket-webui/compare/v0.0.3...v0.0.4) (2022-03-10)

#### Fixed

* address copy button on http sites ([#165](https://github.com/joinmarket-webui/joinmarket-webui/issues/165)) ([34f8d2d](https://github.com/joinmarket-webui/joinmarket-webui/commit/34f8d2dc2b2fb50def6ed3e316e50db769f84154))
* page reloads ([#162](https://github.com/joinmarket-webui/joinmarket-webui/issues/162)) ([78d15a1](https://github.com/joinmarket-webui/joinmarket-webui/commit/78d15a1a30c5bc755085820bbd85d02056c78eeb))
* suggest number of collaborators based on configured minimum ([#116](https://github.com/joinmarket-webui/joinmarket-webui/issues/116)) ([d2c36bf](https://github.com/joinmarket-webui/joinmarket-webui/commit/d2c36bfc65311163f05c7415993a09c5d5131f82))
* update suggested number of collaborators ([#150](https://github.com/joinmarket-webui/joinmarket-webui/issues/150)) ([26ffe8c](https://github.com/joinmarket-webui/joinmarket-webui/commit/26ffe8cdeb2146a757c90d05b67d3304485af918))
* qrcode on receive page ([#146](https://github.com/joinmarket-webui/joinmarket-webui/issues/146)) ([87299b3](https://github.com/joinmarket-webui/joinmarket-webui/commit/87299b3268fbcb3710ce81cf3db8419325994138))
* warn on missing config vars ([#152](https://github.com/joinmarket-webui/joinmarket-webui/issues/152)) ([3180103](https://github.com/joinmarket-webui/joinmarket-webui/commit/3180103da67f70dfd2030cc9db403d30a58a1b4a))

#### Added

* show seed phrase in settings ([#160](https://github.com/joinmarket-webui/joinmarket-webui/issues/160)) ([7fb76ff](https://github.com/joinmarket-webui/joinmarket-webui/commit/7fb76ff5d54a03e3ef0763e94f3f10bc3e73c503))
* i18n ([#153](https://github.com/joinmarket-webui/joinmarket-webui/issues/153)) ([cc168eb](https://github.com/joinmarket-webui/joinmarket-webui/commit/cc168eb49faf7495bc653ff104f6cac1c090dbbe))

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
