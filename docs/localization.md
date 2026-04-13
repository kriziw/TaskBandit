# Localization

TaskBandit now includes a first-pass localization foundation with language files in each app layer.

## Initial Supported Languages

- English (`en`)
- German (`de`)
- Hungarian (`hu`)

## File Locations

- Server API language files: `apps/server/src/common/i18n/locales`
- Web UI language files: `apps/web/src/i18n/locales`
- Android language resources:
  - `apps/android/app/src/main/res/values`
  - `apps/android/app/src/main/res/values-de`
  - `apps/android/app/src/main/res/values-hu`

## Current Scope

- The server uses language files for user-facing API messages such as bootstrap conflicts and language discovery.
- The web app uses JSON dictionaries with a runtime language picker.
- The Android app uses localized string resources for the current shell UI.
- Default starter templates are shipped with English, German, and Hungarian group, type, sub-type, checklist, and follow-up labels so a fresh household can import useful translated templates during first setup.
- User-created templates remain household data. Admins and parent users maintain their translated group, type, sub-type, and description values in the web admin template editor.

## Next Steps

- Expand translation coverage as more screens and API messages are added.
- Align server and client translation keys more tightly as the product grows.
- Persist the user or household language preference once authentication is in place.
