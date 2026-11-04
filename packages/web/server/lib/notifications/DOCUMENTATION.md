# Notifications Module Documentation

## Purpose
This module provides notification message preparation utilities for the web server runtime, including text truncation and plain-text normalization for system notifications.

## Entrypoints and structure
- `packages/web/server/lib/notifications/index.js`: public entrypoint imported by `packages/web/server/index.js`.
- `packages/web/server/lib/notifications/routes.js`: route registration for push, visibility, and session status endpoints.
- `packages/web/server/lib/notifications/emit-route.js`: the plugin notification route (`POST /api/notifications/emit`) and its emitter (`createPluginNotificationEmitter`, built in `packages/web/server/index.js`). Registered from `bootstrap-runtime.js`; validates title/body/tag/session/directory, rate-limits to 10 per 10 s per process, respects `nativeNotificationsEnabled`, and sends one desktop + UI notification with `kind: 'plugin'` (`requireHidden`, `showWhenFocused`).
- `packages/web/server/lib/notifications/push-runtime.js`: push subscription persistence, VAPID initialization, and UI visibility runtime.
- `packages/web/server/lib/notifications/apns-runtime.js`: native APNs/FCM token persistence and delivery. Relay mode signs requests through the shared host `relayKeyStore`; it does not create a signing keypair in notification settings. Direct APNs delivery uses ES256 and HTTP/2 when `OPENCHAMBER_PUSH_RELAY_DISABLED=true`. Native delivery is not gated on UI visibility; iOS suppresses foreground banners. A registered device `pushKey` seals notification text, while legacy registrations receive generic text. See `APNS.md`.
- `packages/web/server/lib/notifications/push-seal.js`: end-to-end sealing of native push text. A phone that registers with a `pushKey` (32 bytes, base64; made by the iOS shell in the App Group, by Android's `PushSealKey`) gets each notification as the generic scenario title, an empty body and `data.enc` = `v1.` + base64(nonce || AES-256-GCM ciphertext || tag) of `{ title, body }`. Each such device is its own relay send. The iOS Notification Service Extension and Android's `SealedPushMessagingService` open it; the relay sends a sealed push to Android as a data message (openchamber-website `apps/api/src/lib/fcm.ts`) so that service runs in the background. The sealed text is richer than the clear one: `runtime.js` passes `sealed` = the session name as title and what happened as body (the agent's reply; `Question:`, `Wants to run:` / `Wants to edit:` / `Wants permission:`, `Error:` or the goal title before the detail). The detail goes through the 250-character message cap before the prefix is added. When there is no such text, the phone opens the generic text. Phones without a key keep getting the generic text in the clear. Enterprise mode sends no `sealed` text and strips the session name, so the phone shows only the scenario title.
- `packages/web/server/lib/notifications/session-key.js`: the key both push stores group registrations under, a `sha256:` hash of the UI session token, never the token. Files written before the hashing are rewritten with hashed keys on first read. Both stores are written `0600`.
- `packages/web/server/lib/notifications/emitter-runtime.js`: desktop/stdout + UI SSE notification emission runtime.
- `packages/web/server/lib/notifications/runtime.js`: trigger runtime for canonical Agent Service events (run completion/failure, approvals, questions) with debouncing, subtask/goal suppression and push fanout.
- `packages/web/server/lib/notifications/template-runtime.js`: notification template variables and session text/title enrichment over the canonical session service, including the session's project, worktree, branch and Host title.
- `packages/web/server/lib/notifications/template-locales.js`: the notification text OpenChamber writes itself, per interface language. An empty template field means "no custom text", so the notification uses these defaults. The server keeps its own list because it cannot import `packages/ui`; an unknown tag falls back to English.
- `packages/web/server/lib/notifications/message.js`: helper implementation module.
- `packages/web/server/lib/notifications/message.test.js`: unit tests for notification message helpers.

## Plugin notification route
`registerNotificationEmitRoutes(app, { express, emitter })` owns exactly one route,
`POST /api/notifications/emit`. The emitter is created in `packages/web/server/index.js`
(`createPluginNotificationEmitter`) from the same desktop/UI emitters the trigger
runtime uses, so plugin notifications behave like native ones and are not a second
delivery path.

## Public exports

### Notifications API (re-exported from message.js)
- `truncateNotificationText(text, maxLength)`: Truncates text to specified max length, appending `...` if truncated.
- `prepareNotificationLastMessage({ message, settings })`: Prepares the last message for notification display by normalizing and truncating text.

### Route registration API (routes.js)
- `registerNotificationRoutes(app, dependencies)`: Registers notification-owned endpoints:
  - `GET /api/push/vapid-public-key`
  - `POST /api/push/subscribe`
  - `DELETE /api/push/subscribe`
  - `POST /api/push/apns-token` (native iOS APNs device-token registration)
  - `DELETE /api/push/apns-token`
  - `POST /api/push/visibility`
  - `GET /api/push/visibility`
  - `GET /api/notifications/stream`
  - `GET /api/session-activity`
  - `GET /api/sessions/snapshot`
  - `GET /api/sessions/status`
  - `GET /api/sessions/:id/status`
  - `POST /api/sessions/:id/view` and `POST /api/sessions/:id/message-sent`: only reset the native push badge. Whether a session is unread is OpenCode's own `time.viewed`.

### Trigger runtime API (runtime.js)
- `createNotificationTriggerRuntime(dependencies)`: creates runtime-owned debounced trigger handling for canonical Agent Service events.
- Returned API: `processCanonicalEvent(event, scope)`, `setAutoAcceptSession`, `setGetIsWindowFocused`, `setGetIsSessionAutoAccepting`, `clearPendingPushBadge`, `sendGoalSettlePush`, `invalidateSession`, `stop`.
- Owns:
  - run completion/failure, approval and question trigger routing with a 500 ms debounce and a resolution cancel; permission requests already auto-accepted by the session or an ancestor are suppressed
  - subtask suppression (`notifyOnSubtasks`) and a live-child check, plus goal-driven completion suppression
  - template resolution and fallback: an empty field in `settings.notificationTemplates` resolves to the language default from `template-locales.js`, so notification text follows `settings.locale` unless the user wrote their own
  - native notification fanout and web push payload fanout
  - push suppression while any fresh UI visibility heartbeat reports a focused client
  - sealed phone text: the fanout forwards `sealed = { title, body }` (localized event text, redacted like the clear body) to APNs for devices with a `pushKey`; enterprise mode drops it, as it drops the clear body

### Push runtime API (push-runtime.js)
- `createPushRuntime(dependencies)`: creates runtime for web push and UI visibility state.
- Returned API:
  - `getOrCreateVapidKeys()`
  - `ensurePushInitialized()`
  - `setPushInitialized(value)`
  - `addOrUpdatePushSubscription(uiSessionToken, subscription, userAgent)`
  - `removePushSubscription(uiSessionToken, endpoint)`
  - `sendPushToAllUiSessions(payload, options?)`
  - `updateUiVisibility(token, visible)`
  - `isAnyUiVisible()`
  - `isUiVisible(token)`

### APNs runtime API (apns-runtime.js)
- `createApnsRuntime(dependencies)` creates native APNs/device-token persistence and delivery. It receives `fsPromises`, `path`, `crypto`, `http2`, `APNS_TOKENS_FILE_PATH`, `readSettingsFromDiskMigrated`, and the host-owned `relayKeyStore`. Push and private relay share that signing store and server identity; do not create a separate key in notification settings.
- Returned API:
  - `addOrUpdateApnsToken(uiSessionToken, deviceToken, userAgent, platform, environment, pushKey?)` persists the registration and binds a newly seen token on the relay. `environment` is `sandbox` or `production`, defaulting to production for older registrations. A valid 32-byte base64 `pushKey` enables AES-256-GCM sealing; invalid keys are discarded, keeping legacy unsealed delivery.
  - `removeApnsToken(uiSessionToken, deviceToken)`
  - `removeApnsTokenFromAllSessions(deviceToken)`
  - `sendApnsToAllUiSessions(payload)` — `payload.sealed` (`{ title, body }`, optional) is what a phone with a push key opens; it is never sent in the clear. Signs + sends to all registered tokens (no UI-visibility gate; iOS suppresses the foreground banner). No-ops with a single warning when APNs is unconfigured. Drops tokens on `410` / `BadDeviceToken` / `Unregistered`.
  - `resolveApnsConfig()`
- Configuration (env first, then `settings.apnsConfig`): `OPENCHAMBER_APNS_KEY_ID`, `OPENCHAMBER_APNS_TEAM_ID`, `OPENCHAMBER_APNS_P8` (PEM contents; literal `\n` accepted) or `OPENCHAMBER_APNS_P8_PATH`, `OPENCHAMBER_APNS_BUNDLE_ID` (default `com.openchamber.app`), `OPENCHAMBER_APNS_ENVIRONMENT` (optional override forcing every send to `sandbox` or `production`; when unset, each token is delivered to the environment it registered with, defaulting to `production` for tokens without one).

### Emitter runtime API (emitter-runtime.js)
- `createNotificationEmitterRuntime(dependencies)`: creates runtime for unified notification emission channels.
- Returned API:
   - `writeSseEvent(res, payload, serializedPayload?)`, where broadcast callers may share one JSON encoding across recipients
  - `emitDesktopNotification(payload)`
  - `broadcastUiNotification(payload)`

### Template runtime API (template-runtime.js)
- `createNotificationTemplateRuntime(dependencies)`: creates shared notification/template runtime. Model-backed summarization was retired after the Zen provider became unavailable.
- Requires `readSessionMetadata(sessionId) -> Promise<metadata|null>`, bound to the Host SQLite metadata store. Each template build reads the current Host custom title before considering a payload or execution-native default title. A strict Host read failure propagates to the trigger runtime's existing generic notification fallback; it must not substitute an execution title for an unreadable Host override. The title-ownership regressions use real SQLite, including renames and corrupt rows; this task has not executed them.
- Returned API:
  - `resolveNotificationTemplate(template, variables)`
  - `shouldApplyResolvedTemplateMessage(template, resolved, variables)`
  - `fetchFreeZenModels()` compatibility stub returning `[]`
  - `resolveZenModel(override)` compatibility stub preserving stored values without validation
  - `validateZenModelAtStartup()` compatibility no-op
  - `summarizeText(text, targetLength, zenModel)` compatibility stub returning local fallback text
  - `extractLastMessageText(payload, maxLength?)`
  - `fetchLastAssistantMessageText(sessionId, messageId, maxLength?, source?)`
  - `maybeCacheSessionInfoFromEvent(payload, { spaceId }?)`: caches a host session's title; an event of a space (`spaceId` set) is not cached, and a space's chat is never read from these caches, so a session id a space names cannot set a host chat's title.
  - `buildTemplateVariables(payload, sessionId, source?)`: `source` (`{ buildOpenCodeUrl, getOpenCodeAuthHeaders, fetchImpl }`, the host's OpenCode by default) is where the session's title and messages are read; `runtime.js` passes the space's for a chat of an isolated space. `{project_name}`, `{worktree}` and `{branch}` come from the event's `directory`, else the session record's `location.directory`; turn-end events carry no location, so they read the record. `{project_name}` is the label of the project the sidebar files that directory under: a directory registered as a project is that project, else its repository's primary worktree (`resolvePrimaryWorktreeRoot`) names it, so a session in a worktree shows its project; a directory under `chatRoots` is `Chats`, since a chat's folder name is a generated id; anything else is its folder name. The project open in the UI is used only when neither names one, as for a form owned by no session, and for a space's chat, whose directory is a path inside the space and is never matched against host projects or run git in on the host.
  - `getCachedZenModels()`

## Constants

### Default values
- `DEFAULT_NOTIFICATION_MESSAGE_MAX_LENGTH`: 250 (default max length for notification text).
- `NOTIFICATION_SSE_HEARTBEAT_INTERVAL_MS`: 20000 (notification SSE comment heartbeat interval).

## Settings object format

The `settings` parameter for `prepareNotificationLastMessage` supports `maxLastMessageLength` (number), the maximum length for the final notification text (default: 250). Legacy summarization settings may still exist in persisted settings but are ignored.

## Response contracts

### `truncateNotificationText`
- Returns empty string for non-string input.
- Returns original text if under max length.
- Returns `${text.slice(0, maxLength)}...` for truncated text.

### `prepareNotificationLastMessage`
- Returns empty string for empty/null message.
- Returns truncated original message. Model-backed notification summarization is retired.
- Normalizes markdown-like formatting to plain text before truncation.
- Always applies `maxLastMessageLength` truncation to final result.

## Notes for contributors

### Adding new notification helpers
1. Add new helper functions to `packages/web/server/lib/notifications/message.js`.
2. Export functions that are intended for public use.
3. Follow existing patterns for input validation (e.g., type checking for strings).
4. Use `resolvePositiveNumber` for numeric parameters with fallbacks to maintain safe defaults.
5. Add corresponding unit tests in `packages/web/server/lib/notifications/message.test.js`.

### Error handling
- `prepareNotificationLastMessage` does not call model summarization.
- Invalid numeric parameters default to safe fallback values.
- Non-string inputs are handled gracefully (return empty string).

### Testing
- Run `bun run type-check`, `bun run lint`, and `bun run build` before finalizing changes.
- Unit tests should cover truncation behavior and edge cases (empty strings, invalid inputs).

## Browser event delivery

Web notifications subscribe to the shared `/api/openchamber/events` control
stream. The emitter sends each notification there and through the existing
global broadcaster. The broadcaster owns the main WebSocket and the legacy
`/api/notifications/stream` endpoint, which remains available to older clients.
Do not call both global and control broadcasters for one notification: they
share the WebSocket client set and would send each frame twice.

The web hook preserves `tag`, `sessionId`, `kind`, and the remaining notification
fields so the web notification API recognizes duplicate control-SSE and main-WS
delivery. Its existing five-second claim suppresses duplicate native alerts.
Native alerts remain best-effort live events, with no historical replay or
synthetic catch-up alerts. Unread marks live in the UI notification store (`packages/ui/src/sync/notification-store.ts`).

This removes one persistent HTTP connection per browser tab in both main-WS and
main-SSE modes. Two tabs use two control SSE connections, or four connections
when their main event pipelines also use SSE. It does not make HTTP/1.1 support
an unlimited number of tabs. The notification hook retains the app's background
work enablement, settings, focus, and runtime gates; it no longer opens a second
connection or switches sources when the main pipeline changes transport.

The control stream retains its browser-control capability declaration, runtime
switch cleanup, stale-source rejection, heartbeat, and reconnect-ready events.
Electron uses its native notification path. Mobile shells retain their existing push behavior.
