# Contributing

## Code of Conduct

Participation in this project is governed by `CODE_OF_CONDUCT.md`.

## Support / questions

If you have end-user questions about packages or the X07 toolchain, use `SUPPORT.md` and
GitHub Discussions. Issues in this repo are for actionable UI bugs.

## Development workflow

- Prefer small PRs with a clear intent.
- Keep builds deterministic and reproducible.

### Setup

```sh
npm ci
```

### Local dev

```sh
npm run dev
```

### Required checks

Run before opening a PR:

```sh
npm run check
npm run build
```
