# Linear OAuth broker hand-off

This fork ships no broker and no built-in Linear application. OAuth sign-in is
available only when an operator points the server at a broker they run.

## Required Linear application change

The broker operator registers their own Linear OAuth application and this exact
redirect URI, substituting their own host:

`https://broker.example.com/v1/oauth/linear/callback`

Linear compares the full redirect URI, including scheme, host, path, and port.
Deploy the broker before testing the flow.

## Why the original callback failed

The first implementation redirected Linear back to the OpenChamber server:

`http://127.0.0.1:<listen-port>/linear/oauth/callback`

That address is not stable across OpenChamber runtimes:

- packaged desktop prefers its stored local port and can select another free
  port when needed;
- local development and the CLI use different ports;
- self-hosted servers may sit behind a reverse proxy or have no public inbound
  address at all.

Linear requires an exact pre-registered callback. Registering every possible
desktop or self-hosted address is impossible, and forcing desktop onto one port
would make startup fail whenever another process owns that port.

## Flow

When `OPENCHAMBER_LINEAR_BROKER_URL` or `settings.json` `linearBrokerUrl` names a
broker, the Linear client uses its stable callback:

1. The OpenChamber server generates OAuth state, a PKCE verifier, and a separate
   claim secret.
2. The broker stores only hashes of state and the claim secret for ten minutes.
3. Linear sends its authorization code to the broker's public callback.
4. The OpenChamber server polls the broker with state and the claim secret.
5. The OpenChamber server exchanges the code using the PKCE verifier and stores
   the Linear tokens locally.
6. After persistence succeeds, OpenChamber acknowledges the hand-off and the
   broker marks it consumed.

The broker never receives the PKCE verifier, access token, or refresh token.
Private Relay is not involved; the local server only needs outbound HTTPS.

With no broker URL and no explicit redirect URI, OAuth sign-in is unavailable:
`POST /api/linear/auth/start` answers 400 with `code: 'LINEAR_BROKER_NOT_CONFIGURED'`, and
`GET /api/linear/auth/status` (and the tracker status) carries
`signIn: { reason: 'broker-url-missing', setting: 'OPENCHAMBER_LINEAR_BROKER_URL', settingsKey:
'linearBrokerUrl' }`, which is what the card renders as the reason plus the setting that enables
it. Workspaces already connected and every non-OAuth Linear path keep working.

## Broker contract

A self-hosted broker exposes the same contract the client expects:

- `POST /start` with `{ state, claimSecret }`; answers with `{ redirectUri }`, which must equal
  `<broker-url>/callback`.
- `GET /callback`: where Linear redirects with `code` and `state`.
- `POST /poll` with `{ state, claimSecret }`; answers `202` while Linear has not redirected yet,
  then `{ status: 'complete', code }` or `{ status: 'failed', error, errorDescription }`.
- `POST /complete` with `{ state, claimSecret }`; marks the transaction consumed.

## Compatibility and configuration

- `OPENCHAMBER_LINEAR_BROKER_URL` or `settings.json` `linearBrokerUrl` selects the
  broker. There is no default.
- `OPENCHAMBER_LINEAR_REDIRECT_URI` or `settings.json` `linearRedirectUri`
  bypasses the broker and preserves the direct callback flow for a custom
  Linear OAuth application.

## Owning files

OpenChamber:

- `auth.js`: broker and redirect configuration.
- `oauth.js`: PKCE, broker registration/poll/acknowledgement, token exchange.
- `routes.js`: starts authorization and completes broker results during status
  polling.

The broker is deployed by its operator; no broker source ships in this
repository.

## Validation

OpenChamber focused tests:

```sh
bunx vitest run \
  packages/web/server/lib/linear/oauth.test.js \
  packages/web/server/lib/linear/auth.test.js \
  packages/web/server/lib/linear/routes.test.js
```
