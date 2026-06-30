# check-dependencies-except-peer — repo card

> A map, not a manual. Keep it ~1 screen; point to detail, don't inline it.

## What it is
An oclif-based CLI that verifies a project's `package-lock.json` is self-consistent and matches the installed `node_modules`, while intentionally ignoring unmatched `peerDependencies`. Published to npm as `check-dependencies-except-peer`.

## serves
role: Dev-tooling CLI for lockfile integrity checks — used in CI pipelines to catch dependency drift without false-positives from peer deps
referenced-by: [Mixmax service CI pipelines, Jenkinsfile-based builds]

## Code map
- CLI entry       -> `bin/run` (oclif runner)
- Command logic   -> `src/index.js` (oclif Command class, arg/flag parsing)
- Check engine    -> `src/check.js` (tree scanning, lockfile reading, consistency verification)
- Built output    -> `dist/index.js` (generated via rollup; not committed)

## Conventions
- Built with rollup (`rollup.config.js`) before publish — run `npm run build`; `dist/` is the published artifact
- No tests exist (`npm test` exits non-zero) — lint is the only CI gate (`npm run ci`)
- ESLint config via `eslint-config-mixmax` + `eslint-config-oclif`; Prettier via `@mixmaxhq/prettier-config`

## Gotchas
- `dist/index.js` is in `.gitignore` but is listed in `package.json#files` — it is generated at publish time only
- `--ignore-peer` flag defaults to `true`; peer dependency violations are silenced unless you explicitly pass `-i false`
- Depends on the legacy `npm` package directly (v6) for internal APIs — do not upgrade without verifying internal API compat

## Run / test
```sh
npm run build        # compile src/ → dist/ via rollup
npm run lint         # eslint (only CI gate)
npm run ci           # alias for lint

# Run the CLI locally (after build):
./bin/run [DIRECTORY]
./bin/run --help

# Publish:
npm publish          # triggers prepublishOnly → build automatically
```

## Load the matching domain card
This repo is cross-cutting tooling — it owns no product domain, so there is no domain card to load. When working here, load the card of the consuming service/domain if the change is driven by its needs.
