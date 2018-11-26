check-dependencies-except-peer
==============================

Ensure that your package-lock matches your package and is self-consistent, and ignore missing peerDependencies

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/check-dependencies-except-peer.svg)](https://npmjs.org/package/check-dependencies-except-peer)
[![Downloads/week](https://img.shields.io/npm/dw/check-dependencies-except-peer.svg)](https://npmjs.org/package/check-dependencies-except-peer)
[![License](https://img.shields.io/npm/l/check-dependencies-except-peer.svg)](https://github.com/mixmaxhq/check-dependencies-except-peer.git/blob/master/LICENSE)

# Usage

```sh
USAGE
  $ check-dependencies-except-peer [DIRECTORY]

ARGUMENTS
  DIRECTORY  [default: PWD] path to the root of the module to check, defaults to the working
             directory

OPTIONS
  -D, --dev          whether to include development dependencies (default both)
  -P, --prod         whether to include production dependencies (default both)
  -h, --help         show CLI help
  -i, --ignore-peer  whether to ignore peer dependencies
  -v, --version      show CLI version

DESCRIPTION
  Scans the lockfile and installed dependencies for inconsistencies. Ignores peer dependency
  violations by default.
```
