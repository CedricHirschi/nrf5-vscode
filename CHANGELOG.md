# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [1.0.0] - 2024-09-23

### Added
- First stable release with core features:
  - **Automatic configuration** of example projects located in the `examples` folder of the nRF5 SDK.
  - **IntelliSense** for the nRF5 SDK APIs by reading the `.emProject` files.
  - **Choice** of the build target, SoftDevice and mode (debug/release) for each project.
  - **Build** and **Flash** the selected project to a connected nRF5 device.
  - **Debug** the selected project using the [`Cortex-Debug`](https://github.com/Marus/cortex-debug) extension.

---

<!-- Links to compare differences between versions -->
[Unreleased]: https://github.com/CedricHirschi/nrf5-examples-manager/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/CedricHirschi/nrf5-examples-manager/releases/tag/v1.0.0
