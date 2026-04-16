# Release Verification

Issue [#100](https://github.com/kriziw/TaskBandit/issues/100) is about reducing release risk with a practical verification baseline. This document defines the current baseline without turning every release into a heavyweight QA ceremony.

## Automated Baseline

Run the server regression suite before cutting a stable release:

```bash
cd apps/server
npm test
```

The current automated baseline focuses on release-sensitive behavior that has caused churn or is easy to regress silently:

- auth settings and member management rules in `SettingsService`
- password reset guards and token consumption in `AuthService`
- derived deployment configuration in `AppConfigService`
- SMTP verification error handling in `SmtpService`
- points calculation in `PointsService`

## Stable Release Smoke Checks

These checks should be repeated against the built application before a stable release. They intentionally cover the three active client surfaces: admin web, client web/PWA, and Android.

### Admin Web

- sign in successfully as an existing household admin
- open household settings and confirm auth options load without errors
- create or edit a chore template and verify the change persists after refresh
- create a chore from the admin UI and confirm it appears in the household chore list

### Client Web Or PWA

- sign in as a household member
- confirm assigned chores load and due state renders correctly
- complete a chore and verify the completion is visible after refresh
- confirm points are awarded only after completion and reflected in the member view

### Android

- sign in with a real household account
- sync and open the assigned chore list
- complete a chore and verify the resulting state survives a refresh or app restart
- confirm the completion becomes visible to the other client surfaces

### Notifications And Delivery Paths

- if SMTP is enabled, run a password-reset request and confirm the email is delivered
- if push notifications are enabled for the release target, trigger one reminder path and confirm delivery or queueing without server errors

### Push-First Private Release Baseline

Issue [#92](https://github.com/kriziw/TaskBandit/issues/92) tracks the push-first notification readiness pass for private releases. Use this as the minimum repeatable check when Android push is expected to be the primary household notification path:

- confirm the server release/build and Android APK release/build match the target release
- sign in as an admin in the web UI and open `Admin` -> `System status`
- verify the Push delivery checklist shows the household switch, server provider, registered devices, and member delivery paths as ready or clearly explains what is missing
- sign in on Android, allow notification permission, and open `Settings` -> `Device registration`
- verify Android shows the device as registered and push-ready, then confirm the same device is visible in the admin `Mobile Push Devices` panel
- send a test notification from the admin `Household Notification Health` panel and confirm the Android notification appears under the TaskBandit notification channel
- create a manually assigned chore for the Android user and confirm the notification inbox record and Android device behavior match
- if Firebase is intentionally not configured, confirm the admin status explains the non-ready provider state rather than implying push is healthy

### Deployment Sanity

- confirm the API health endpoint returns success
- confirm the configured public web and API URLs match the release environment
- confirm the app starts without runtime configuration errors in the logs

## Notes

- This is intentionally a first slice, not the final verification strategy.
- The automated coverage is currently server-heavy, so the cross-client checks remain manual for now.
- When new release-critical workflows are added, either extend the automated suite or add a specific smoke-check line here in the same PR.
