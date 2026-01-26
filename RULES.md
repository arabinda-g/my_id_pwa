# Passkey + Security Rules

## Settings & UI
- Settings option in the drawer opens a settings modal.
- Settings modal must be clean, modern, light theme.
- Passkey register action exists in settings.
- When passkey is registered, the register button label becomes "Re-register passkey".
- Remove passkey requires a confirmation that warns about reduced security and unencrypted local data.
- Passkey verify prompt must show a full overlay modal with cancel before any passkey request.
- The prompt modal must be small, cute, and professional (no outer chrome or X button).
- After verification, the prompt switches to a success state and hides quickly.
- For registration, the prompt copy must say it is setting up a passkey.
- App startup can require passkey (toggle); default is OFF after registration.

## Passkey Gating
- Opening Settings when passkey is registered requires passkey verification.
- Switching to Edit mode when passkey is registered requires passkey verification.
- Export, Import, and Clear All Data require passkey verification when registered.
- Removing or re-registering passkey requires verification of the existing passkey.

## Locks (Sections & Fields)
- Lock controls show in Edit mode; locked sections show unlock in View mode.
- Sections can be locked in Edit mode and unlocked in View mode.
- Each section and each field can be locked.
- Locked items must require an extra passkey verification to unlock in View mode.
- Unlocking a section does not unlock any locked fields inside it.
- Unlocking a section in View mode is temporary (reload stays locked).
- If a pinned field is locked, opening it must require passkey verification.
- Locked fields are still clickable in View mode to trigger unlock.
- Entering Edit mode unlocks everything for that session (no lock gating in edit).
- Clicking locked first/last name shows the full name in the modal.

## Data Protection
- When passkey is enabled, all values except profile image must be encrypted before storage.
- On enabling passkey, immediately encrypt and purge any unencrypted local data.
- On removing passkey (after confirmation + verification), decrypt back to plain storage.
- When a section/field is locked, its data must not be loaded into RAM until unlocked.
