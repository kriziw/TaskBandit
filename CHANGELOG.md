# Changelog

All notable changes to TaskBandit will be documented in this file.

## [0.9.0](https://github.com/kriziw/TaskBandit/compare/taskbandit-v0.8.0...taskbandit-v0.9.0) (2026-04-04)


### Features

* add admin household notification health view ([0caeddb](https://github.com/kriziw/TaskBandit/commit/0caeddbcdf0de252046f782e5921a8eac02dfb85))
* add admin household snapshot export ([abb6ebf](https://github.com/kriziw/TaskBandit/commit/abb6ebf0a292895f9dcfb5e2d07f2bf4e5e2fb5b))
* add admin system status diagnostics ([209159f](https://github.com/kriziw/TaskBandit/commit/209159fc2e0f7ca51ec7377e016f6f4f0f2c88ee))
* add admin test notification flow ([895c88f](https://github.com/kriziw/TaskBandit/commit/895c88ffc745f406ea62b312822ca0b6432eb80d))
* add admin-managed auth provider settings ([a1c3e48](https://github.com/kriziw/TaskBandit/commit/a1c3e485bbdcc7f84530f841fd60a6f963211006))
* add backup readiness admin panel ([9baeee6](https://github.com/kriziw/TaskBandit/commit/9baeee699313b4bfde655fd781a86212e98e8334))
* add first-run admin onboarding ([9340e6c](https://github.com/kriziw/TaskBandit/commit/9340e6c18bb8cd4bee6430454fbaa9fd3a1d9376))
* add household member editing ([14855a0](https://github.com/kriziw/TaskBandit/commit/14855a0f02aa5d8c3a410a7cff2f08cf0370a514))
* add member invite emails ([98de037](https://github.com/kriziw/TaskBandit/commit/98de03719f612fb42e905b147e3317d761f30004))
* add member notification preferences ([d584725](https://github.com/kriziw/TaskBandit/commit/d584725645b5755ae6a2aa665354d2973391bd0a))
* add notification recovery admin tools ([0f91a21](https://github.com/kriziw/TaskBandit/commit/0f91a21f7eb6f544d8adf43af54dd39ad8f05131))
* add optional firebase push delivery ([42fc954](https://github.com/kriziw/TaskBandit/commit/42fc954e96921e16bd20804ca95c67dc44837170))
* add optional oidc sign-in flow ([026d3ca](https://github.com/kriziw/TaskBandit/commit/026d3ca428064f6db9a32e0114aed49b2c2bfdff))
* add push device registration groundwork ([c73431f](https://github.com/kriziw/TaskBandit/commit/c73431f3c75daf49c09ca9b2aaa04bc1ce9e0840))
* add push-first email notification fallback ([a3daa9a](https://github.com/kriziw/TaskBandit/commit/a3daa9a1a0374c3cfbd2df020145bdbf57e53427))
* add smtp settings in admin ui ([959c550](https://github.com/kriziw/TaskBandit/commit/959c5503bdf1777cc9284515660519aeb2484ba9))
* add smtp-backed password reset flow ([666ddb4](https://github.com/kriziw/TaskBandit/commit/666ddb4549bd8b85354767a805c929a7f6976374))
* make docker data root migration-friendly ([262451b](https://github.com/kriziw/TaskBandit/commit/262451be33d3f4d7f882d5e515b35a789be8b5b8))
* polish workspace navigation ([bfd1441](https://github.com/kriziw/TaskBandit/commit/bfd144157a228dad2de3d6f6f955a51e3f8e1ba0))
* prefill member creation with strong password ([de822b2](https://github.com/kriziw/TaskBandit/commit/de822b201891349d66a9fca176ded94e713de51d))
* prefill member creation with strong password ([f6b95c0](https://github.com/kriziw/TaskBandit/commit/f6b95c0b50e2c7073e8ef148b35dfe215ff6ca55))
* prepare automated prerelease workflow ([46610dc](https://github.com/kriziw/TaskBandit/commit/46610dcd0f24fa1cee5cbe764a5f41999f7444e3))
* redesign web dashboard shell ([1e13c64](https://github.com/kriziw/TaskBandit/commit/1e13c64a54f8bfcc937ffe8d17a95644bdd4a9c9))
* serve web ui from server image ([b0e148c](https://github.com/kriziw/TaskBandit/commit/b0e148c29a0541db9953f00e2639650ccce05e46))
* show member auth providers ([4005ef6](https://github.com/kriziw/TaskBandit/commit/4005ef62f5a1ca84b55297a55c6d2b727d861361))
* show notification delivery status in web ui ([87e5839](https://github.com/kriziw/TaskBandit/commit/87e58399caf0d10f947682c87e561721ce97c160))
* surface mobile push readiness in web settings ([b2377f2](https://github.com/kriziw/TaskBandit/commit/b2377f21c8d9da42cdc2aa88b0166c8bc2e6c5d9))


### Bug Fixes

* add manual workflow to backfill release tags ([fc1e6d0](https://github.com/kriziw/TaskBandit/commit/fc1e6d00efb3445a874797e6e70ea72a44e5d535))
* add web favicon ([d9a375d](https://github.com/kriziw/TaskBandit/commit/d9a375dc5a2388ea8ce96e454e630a536badf5b5))
* correct hungarian locale accents ([0d41bff](https://github.com/kriziw/TaskBandit/commit/0d41bff5adfe7447c14ebf8acf5931f8a4262f0e))
* escape android widget subtitle string ([543c96b](https://github.com/kriziw/TaskBandit/commit/543c96be3936272e34c99cee021d0a13643a5170))
* make release-please manual-only ([9072983](https://github.com/kriziw/TaskBandit/commit/907298378c1c82b8285704cdea12ac0544ba5e54))
* prevent overlapping notification workers ([f78b557](https://github.com/kriziw/TaskBandit/commit/f78b557609bb578108cf04289219ea9e1f9a0ad5))
* remove redundant overview navigation ([aa89962](https://github.com/kriziw/TaskBandit/commit/aa89962786b297df09a019aaf70498dd65e5584d))
* repair historical release changelog entries ([85ecb27](https://github.com/kriziw/TaskBandit/commit/85ecb274768f0def3d8ad8412098cea06b09de9b))
* repair historical release changelog entries ([1e108c8](https://github.com/kriziw/TaskBandit/commit/1e108c87bc8d3dfdb9601b155c767f6a601bbd32))
* republish docker image for web changes ([7a98f5e](https://github.com/kriziw/TaskBandit/commit/7a98f5ea29df4cb76371b535f039dd2b3c898fdf))
* resolve android local and release build issues ([eee75ec](https://github.com/kriziw/TaskBandit/commit/eee75ececf894268d149232814e5a94a530a000e))
* restore automatic release-please trigger ([97edcf4](https://github.com/kriziw/TaskBandit/commit/97edcf412f6b46698aeb6d64bbfefbf5e23f1c73))
* restore jump links for stacked workspace panels ([a753774](https://github.com/kriziw/TaskBandit/commit/a75377484bfc5daf3a83258923f0562e8c924c7b))
* skip release-please label mutations ([f581759](https://github.com/kriziw/TaskBandit/commit/f5817598d207adb07d0858424b7430af4df74bf8))
* tighten web ui spacing density ([4184d58](https://github.com/kriziw/TaskBandit/commit/4184d58debea77ec58fab9c1f04e74f03b4217ee))
* use checked-in release-please configs ([5ff1d24](https://github.com/kriziw/TaskBandit/commit/5ff1d2470d7015782183aa8a9c5c6ad217e5afdf))
* use debian base for server image ([e2e80f1](https://github.com/kriziw/TaskBandit/commit/e2e80f17f89c92c805f998d13daff804f818716b))
* use hungarian-safe brand font ([94591be](https://github.com/kriziw/TaskBandit/commit/94591beaf43f514fd9ee5628f330985d946cb1c0))

## [0.8.0](https://github.com/kriziw/TaskBandit/compare/taskbandit-v0.7.0...taskbandit-v0.8.0) (2026-04-04)


### Features

* prefill member creation with strong password ([f6b95c0](https://github.com/kriziw/TaskBandit/commit/f6b95c0b50e2c7073e8ef148b35dfe215ff6ca55))


### Bug Fixes

* add manual workflow to backfill release tags ([fc1e6d0](https://github.com/kriziw/TaskBandit/commit/fc1e6d00efb3445a874797e6e70ea72a44e5d535))
* add web favicon ([d9a375d](https://github.com/kriziw/TaskBandit/commit/d9a375dc5a2388ea8ce96e454e630a536badf5b5))
* make release-please manual-only ([9072983](https://github.com/kriziw/TaskBandit/commit/907298378c1c82b8285704cdea12ac0544ba5e54))
* remove redundant overview navigation ([aa89962](https://github.com/kriziw/TaskBandit/commit/aa89962786b297df09a019aaf70498dd65e5584d))
* republish docker image for web changes ([7a98f5e](https://github.com/kriziw/TaskBandit/commit/7a98f5ea29df4cb76371b535f039dd2b3c898fdf))
* restore automatic release-please trigger ([97edcf4](https://github.com/kriziw/TaskBandit/commit/97edcf412f6b46698aeb6d64bbfefbf5e23f1c73))
* restore jump links for stacked workspace panels ([a753774](https://github.com/kriziw/TaskBandit/commit/a75377484bfc5daf3a83258923f0562e8c924c7b))
* tighten web ui spacing density ([4184d58](https://github.com/kriziw/TaskBandit/commit/4184d58debea77ec58fab9c1f04e74f03b4217ee))

## [0.7.0](https://github.com/kriziw/TaskBandit/compare/taskbandit-v0.6.0...taskbandit-v0.7.0) (2026-04-04)

No user-facing changes were intended in this release. It was cut while the release tags were out of sync, which caused release automation to reopen already-released history.

## [0.6.0](https://github.com/kriziw/TaskBandit/compare/taskbandit-v0.5.0...taskbandit-v0.6.0) (2026-04-04)

No user-facing changes were intended in this release. It was cut while the release tags were out of sync, which caused release automation to reopen already-released history.

## [0.5.0](https://github.com/kriziw/TaskBandit/compare/taskbandit-v0.4.0...taskbandit-v0.5.0) (2026-04-04)


### Features

* polish workspace navigation ([bfd1441](https://github.com/kriziw/TaskBandit/commit/bfd144157a228dad2de3d6f6f955a51e3f8e1ba0))
* redesign web dashboard shell ([1e13c64](https://github.com/kriziw/TaskBandit/commit/1e13c64a54f8bfcc937ffe8d17a95644bdd4a9c9))


### Bug Fixes

* correct hungarian locale accents ([0d41bff](https://github.com/kriziw/TaskBandit/commit/0d41bff5adfe7447c14ebf8acf5931f8a4262f0e))
* prevent overlapping notification workers ([f78b557](https://github.com/kriziw/TaskBandit/commit/f78b557609bb578108cf04289219ea9e1f9a0ad5))
* use hungarian-safe brand font ([94591be](https://github.com/kriziw/TaskBandit/commit/94591beaf43f514fd9ee5628f330985d946cb1c0))

## [0.4.0](https://github.com/kriziw/TaskBandit/compare/taskbandit-v0.3.0...taskbandit-v0.4.0) (2026-04-04)


### Features

* serve web ui from server image ([b0e148c](https://github.com/kriziw/TaskBandit/commit/b0e148c29a0541db9953f00e2639650ccce05e46))

## [0.3.0](https://github.com/kriziw/TaskBandit/compare/taskbandit-v0.2.1...taskbandit-v0.3.0) (2026-04-04)


### Features

* add admin household notification health view ([0caeddb](https://github.com/kriziw/TaskBandit/commit/0caeddbcdf0de252046f782e5921a8eac02dfb85))
* add admin household snapshot export ([abb6ebf](https://github.com/kriziw/TaskBandit/commit/abb6ebf0a292895f9dcfb5e2d07f2bf4e5e2fb5b))
* add admin system status diagnostics ([209159f](https://github.com/kriziw/TaskBandit/commit/209159fc2e0f7ca51ec7377e016f6f4f0f2c88ee))
* add admin test notification flow ([895c88f](https://github.com/kriziw/TaskBandit/commit/895c88ffc745f406ea62b312822ca0b6432eb80d))
* add admin-managed auth provider settings ([a1c3e48](https://github.com/kriziw/TaskBandit/commit/a1c3e485bbdcc7f84530f841fd60a6f963211006))
* add backup readiness admin panel ([9baeee6](https://github.com/kriziw/TaskBandit/commit/9baeee699313b4bfde655fd781a86212e98e8334))
* add first-run admin onboarding ([9340e6c](https://github.com/kriziw/TaskBandit/commit/9340e6c18bb8cd4bee6430454fbaa9fd3a1d9376))
* add household member editing ([14855a0](https://github.com/kriziw/TaskBandit/commit/14855a0f02aa5d8c3a410a7cff2f08cf0370a514))
* add member invite emails ([98de037](https://github.com/kriziw/TaskBandit/commit/98de03719f612fb42e905b147e3317d761f30004))
* add member notification preferences ([d584725](https://github.com/kriziw/TaskBandit/commit/d584725645b5755ae6a2aa665354d2973391bd0a))
* add notification recovery admin tools ([0f91a21](https://github.com/kriziw/TaskBandit/commit/0f91a21f7eb6f544d8adf43af54dd39ad8f05131))
* add optional firebase push delivery ([42fc954](https://github.com/kriziw/TaskBandit/commit/42fc954e96921e16bd20804ca95c67dc44837170))
* add optional oidc sign-in flow ([026d3ca](https://github.com/kriziw/TaskBandit/commit/026d3ca428064f6db9a32e0114aed49b2c2bfdff))
* add push device registration groundwork ([c73431f](https://github.com/kriziw/TaskBandit/commit/c73431f3c75daf49c09ca9b2aaa04bc1ce9e0840))
* add push-first email notification fallback ([a3daa9a](https://github.com/kriziw/TaskBandit/commit/a3daa9a1a0374c3cfbd2df020145bdbf57e53427))
* add smtp settings in admin ui ([959c550](https://github.com/kriziw/TaskBandit/commit/959c5503bdf1777cc9284515660519aeb2484ba9))
* add smtp-backed password reset flow ([666ddb4](https://github.com/kriziw/TaskBandit/commit/666ddb4549bd8b85354767a805c929a7f6976374))
* make docker data root migration-friendly ([262451b](https://github.com/kriziw/TaskBandit/commit/262451be33d3f4d7f882d5e515b35a789be8b5b8))
* prepare automated prerelease workflow ([46610dc](https://github.com/kriziw/TaskBandit/commit/46610dcd0f24fa1cee5cbe764a5f41999f7444e3))
* show member auth providers ([4005ef6](https://github.com/kriziw/TaskBandit/commit/4005ef62f5a1ca84b55297a55c6d2b727d861361))
* show notification delivery status in web ui ([87e5839](https://github.com/kriziw/TaskBandit/commit/87e58399caf0d10f947682c87e561721ce97c160))
* surface mobile push readiness in web settings ([b2377f2](https://github.com/kriziw/TaskBandit/commit/b2377f21c8d9da42cdc2aa88b0166c8bc2e6c5d9))


### Bug Fixes

* escape android widget subtitle string ([543c96b](https://github.com/kriziw/TaskBandit/commit/543c96be3936272e34c99cee021d0a13643a5170))
* resolve android local and release build issues ([eee75ec](https://github.com/kriziw/TaskBandit/commit/eee75ececf894268d149232814e5a94a530a000e))
* skip release-please label mutations ([f581759](https://github.com/kriziw/TaskBandit/commit/f5817598d207adb07d0858424b7430af4df74bf8))
* use checked-in release-please configs ([5ff1d24](https://github.com/kriziw/TaskBandit/commit/5ff1d2470d7015782183aa8a9c5c6ad217e5afdf))
* use debian base for server image ([e2e80f1](https://github.com/kriziw/TaskBandit/commit/e2e80f17f89c92c805f998d13daff804f818716b))

## [0.2.1](https://github.com/kriziw/TaskBandit/compare/taskbandit-v0.2.0...taskbandit-v0.2.1) (2026-04-04)


### Bug Fixes

* use debian base for server image ([e2e80f1](https://github.com/kriziw/TaskBandit/commit/e2e80f17f89c92c805f998d13daff804f818716b))

## [0.2.0](https://github.com/kriziw/TaskBandit/compare/taskbandit-v0.1.0...taskbandit-v0.2.0) (2026-04-04)


### Features

* add admin household notification health view ([0caeddb](https://github.com/kriziw/TaskBandit/commit/0caeddbcdf0de252046f782e5921a8eac02dfb85))
* add admin household snapshot export ([abb6ebf](https://github.com/kriziw/TaskBandit/commit/abb6ebf0a292895f9dcfb5e2d07f2bf4e5e2fb5b))
* add admin system status diagnostics ([209159f](https://github.com/kriziw/TaskBandit/commit/209159fc2e0f7ca51ec7377e016f6f4f0f2c88ee))
* add admin test notification flow ([895c88f](https://github.com/kriziw/TaskBandit/commit/895c88ffc745f406ea62b312822ca0b6432eb80d))
* add admin-managed auth provider settings ([a1c3e48](https://github.com/kriziw/TaskBandit/commit/a1c3e485bbdcc7f84530f841fd60a6f963211006))
* add backup readiness admin panel ([9baeee6](https://github.com/kriziw/TaskBandit/commit/9baeee699313b4bfde655fd781a86212e98e8334))
* add first-run admin onboarding ([9340e6c](https://github.com/kriziw/TaskBandit/commit/9340e6c18bb8cd4bee6430454fbaa9fd3a1d9376))
* add household member editing ([14855a0](https://github.com/kriziw/TaskBandit/commit/14855a0f02aa5d8c3a410a7cff2f08cf0370a514))
* add member invite emails ([98de037](https://github.com/kriziw/TaskBandit/commit/98de03719f612fb42e905b147e3317d761f30004))
* add member notification preferences ([d584725](https://github.com/kriziw/TaskBandit/commit/d584725645b5755ae6a2aa665354d2973391bd0a))
* add notification recovery admin tools ([0f91a21](https://github.com/kriziw/TaskBandit/commit/0f91a21f7eb6f544d8adf43af54dd39ad8f05131))
* add optional firebase push delivery ([42fc954](https://github.com/kriziw/TaskBandit/commit/42fc954e96921e16bd20804ca95c67dc44837170))
* add optional oidc sign-in flow ([026d3ca](https://github.com/kriziw/TaskBandit/commit/026d3ca428064f6db9a32e0114aed49b2c2bfdff))
* add push device registration groundwork ([c73431f](https://github.com/kriziw/TaskBandit/commit/c73431f3c75daf49c09ca9b2aaa04bc1ce9e0840))
* add push-first email notification fallback ([a3daa9a](https://github.com/kriziw/TaskBandit/commit/a3daa9a1a0374c3cfbd2df020145bdbf57e53427))
* add smtp settings in admin ui ([959c550](https://github.com/kriziw/TaskBandit/commit/959c5503bdf1777cc9284515660519aeb2484ba9))
* add smtp-backed password reset flow ([666ddb4](https://github.com/kriziw/TaskBandit/commit/666ddb4549bd8b85354767a805c929a7f6976374))
* make docker data root migration-friendly ([262451b](https://github.com/kriziw/TaskBandit/commit/262451be33d3f4d7f882d5e515b35a789be8b5b8))
* prepare automated prerelease workflow ([46610dc](https://github.com/kriziw/TaskBandit/commit/46610dcd0f24fa1cee5cbe764a5f41999f7444e3))
* show member auth providers ([4005ef6](https://github.com/kriziw/TaskBandit/commit/4005ef62f5a1ca84b55297a55c6d2b727d861361))
* show notification delivery status in web ui ([87e5839](https://github.com/kriziw/TaskBandit/commit/87e58399caf0d10f947682c87e561721ce97c160))
* surface mobile push readiness in web settings ([b2377f2](https://github.com/kriziw/TaskBandit/commit/b2377f21c8d9da42cdc2aa88b0166c8bc2e6c5d9))


### Bug Fixes

* escape android widget subtitle string ([543c96b](https://github.com/kriziw/TaskBandit/commit/543c96be3936272e34c99cee021d0a13643a5170))
* resolve android local and release build issues ([eee75ec](https://github.com/kriziw/TaskBandit/commit/eee75ececf894268d149232814e5a94a530a000e))
* use checked-in release-please configs ([5ff1d24](https://github.com/kriziw/TaskBandit/commit/5ff1d2470d7015782183aa8a9c5c6ad217e5afdf))

## 0.1.0 (2026-04-04)

### Features

- Initial private-preview release foundation for the TaskBandit server, web UI, and Android app.
