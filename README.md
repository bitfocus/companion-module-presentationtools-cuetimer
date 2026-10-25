# companion-module-presentationtools-cuetimer

See HELP.md and LICENSE

## Development

Companion loads this folder as a developer module when its "developer modules path" points at the parent folder (`yarn install` first).

Cloud mode connects to a fixed endpoint (`DEFAULT_CLOUD_URL` in `src/config.js`). To test against a local or staging engine, copy `.env.example` to `.env` and set `CUETIMER_CLOUD_URL`; the file is git-ignored and is not part of a packaged module. The environment variable of the same name works too.

`yarn test`, `yarn lint`, `yarn package`.
