# Switching between projects in the Crewser crew app

Status: proposal for the production app. The prototype shows the behaviour with mock data only.

## The idea in one paragraph

Crew members on film sets often work on more than one production at the same time, and a department member may enter hours for colleagues (a 1st AC for the camera team, a gaffer for lighting, a key grip for grip). Crewser already gives every person on every project their own personal access link by SMS. We keep it that way: **each crew link stays a separate credential**. The app simply remembers several links on the phone and lets the user choose which one is active. No shared account, no login, and no change to the backend is needed to ship this.

## What the user sees

- A project switcher at the top of the app lists all links on the phone: project name, production, whose hours the link is for, and when it expires.
- Links that expire soon show a warning (for example "expires in 3 days"). Expired links are greyed out and cannot be selected; the user is told to ask production for a new link.
- Selecting a link switches the whole app (dashboard, calendar, documents, contacts) to that project and person.
- A 1st AC who holds links for camera colleagues sees them in the same list, marked with the person's name, so it is always clear whose hours are being entered. The same pattern applies to lighting and grip, where one person logs hours for the whole department.

## The local wallet

The app keeps a small "wallet" on the device. Each entry holds only what is needed to call the API:

| Field | Purpose |
|---|---|
| `projectId` | Which production the link belongs to |
| `crewMemberId` | Which person the link belongs to |
| `token` | The secret from the SMS link |
| `expiresAt` | When the link stops working |

Display data (project name, person name, department) is cached next to it so the switcher works offline, but it is never treated as authoritative.

Where the wallet lives:

- **Native app:** iOS Keychain and Android Keystore-backed encrypted storage.
- **Browser (no install):** IndexedDB on the Crewser origin. It is not a secure enclave, so tokens there are short-lived by design and the user can remove them at any time.

A link is added to the wallet when the user opens an SMS link. If the link is already in the wallet, the entry is refreshed instead of duplicated.

## Checking that a link still works

- On start and whenever the app returns to the foreground, it makes one cheap call per link in the background, for example `GET /crew/me` with that link's token.
  - `200`: the link is valid; refresh the cached display data.
  - `401` or `410`: the link is expired or revoked; mark it as expired in the wallet.
  - Network error: keep the previous status. Offline is never treated as expired.
- The expiry date is also known locally, so warnings ("expires in 7 days", "expires in 3 days", "expired") work offline.
- Only the active link's data is loaded in full. The other links are only checked, not synced, to save battery and data.

## Hours are always sent with the right token

This is the key safety rule: **an hours entry is only ever submitted with the token of the crew member it is for.**

- Every screen that edits hours works on one selected link. Switching link clears any open draft form.
- A 1st AC (or gaffer, or key grip) entering hours for a colleague uses the colleague's link. The server therefore sees exactly the same request as if the colleague had entered them, with the same validation, rest-time checks and approval flow.
- The app never mixes tokens in one request and never sends a token to a project it does not belong to. The API base URL comes from the link, not from a global setting.
- The department head's own link has no extra power over colleagues' hours. If production revokes the colleague's link, the department head can no longer enter for that person, which is what production wants.

## What the backend needs today

Nothing new. Each link already identifies one person on one project, and every existing endpoint works with a single token. Project switching is a client-side feature: the phone chooses which token to send.

## Optional later improvements

These are not required for a first release.

1. **Device-bound session.** A one-time exchange turns a crew link into a longer-lived session token bound to the device, so the SMS link itself can be single-use and short-lived.
2. **Account linking.** The user can optionally link several crew links to one Crewser account (email or phone) to restore the wallet on a new phone. Links stay separate credentials underneath.
3. **Grouped sessions.** The backend can return a list of all projects a verified phone number belongs to, so a new link does not have to be tapped from an SMS.
4. **Push reminders per project,** for example "day not submitted", routed by link.

## Offline drafts

- Drafts are stored per link: `drafts[tokenId][date]`. A draft for one project can never be submitted under another.
- When the phone is back online, the app submits each draft with the token it was created under. If that token has expired in the meantime, the draft stays on the phone, is marked "needs a new link" and is not lost.
- Removing a link asks whether to keep or discard its unsent drafts.

## Removing a link

- "Remove from this phone" deletes the wallet entry and the cached data for that link. It does not revoke the link on the server, so the user can open the SMS again later.
- Production can revoke a link at any time (for example when someone leaves the crew). The next validity check returns `401` or `410` and the app marks it expired.

## Security notes

- **Where the token travels.** In the SMS link the token should sit in the URL fragment (`https://go.crewser.app/#token=...`) rather than the query string. Fragments are not sent to servers, proxies or analytics tools, and are not written to server logs. The app reads the fragment once, stores the token in the wallet and immediately replaces the URL with a clean one.
- **Authorization header.** API calls carry the token in a header, never in the URL.
- **Never logged.** Tokens are not written to console logs, crash reports or analytics events. Error reports use a short, non-reversible identifier of the token instead.
- **Least privilege.** A crew token can only read and write that one person's data on that one project.
- **Expiry and revocation.** Tokens have a fixed end date set by production and can be revoked server-side. Clients must treat `401` and `410` as final for that link.
- **Shared phones.** On a shared or lost phone, the user (or production, by revoking the link) can cut access. The browser version does not keep tokens longer than the link's expiry.
- **Clipboard and screenshots.** The app does not display or copy the raw token. The "Switch project" list shows names only.

## Summary

Keep every crew link as its own credential, store them together in a protected wallet on the phone, check each one quietly in the background, and always send hours with the token of the person they belong to. The result is a fast switcher for crews working on parallel productions, with no backend change and no new account to create.
