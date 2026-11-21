# Firebase safety and application identity

This app uses the shared Firebase project `inter-level-progress-manager`.

The only authoritative Firestore and Storage rules repository is `https://github.com/jeevanvarghese579/school-softwares-firebase-shared-config`. Do not create, replace, or deploy Firestore or Storage rules from this repository, and never run an unscoped `firebase deploy`.

This is an existing isolated app.

- Canonical appKey: `schoolAcademicsManager`
- Firebase Web App ID: `1:379503088311:web:b52c1e725e81bfdc133332`
- Hosting site: `school-academics-manager`

Preserve these identifiers and the existing Firestore data paths. This app may access only `/apps/schoolAcademicsManager/users/{uid}/...`, with access additionally controlled through Firebase Access Manager using the fixed Web App ID above. Do not create a new namespace or migrate data unless the user explicitly requests it.

If permissions must change, make the smallest possible change to the canonical `firestore.rules` or `storage.rules`, without weakening or overwriting other apps' rules. Add or update emulator tests, run the complete rules test suite, perform a Firebase dry run, and show the exact proposed rule changes for explicit approval before deployment. Never grant generic authenticated-user access, generic `/users/**` access, access to another app namespace, or unidentified legacy collections.

For Hosting, deploy only `firebase deploy --only hosting:school-academics-manager`. For Functions, deploy only explicitly named functions. Never delete or migrate production data without an exact manifest, confirmed backup, and explicit action-time approval.
