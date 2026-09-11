# Contributing

Node 20 or later. pnpm 10 (`packageManager` in `package.json`).

```bash
pnpm install
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test` is coverage-gated at 100% on `src/` except the CLI process wrapper.

Open a pull request against `main`. CI runs format, lint, typecheck, tests, and build on Node 20 and 22.

## Release

1. Bump `version` in `package.json`.
2. Add a `CHANGELOG.md` entry.
3. Tag `v0.1.0` (same as the version) and push the tag.
4. The Publish workflow ships to npm. It needs the `NPM_TOKEN` repository secret.
