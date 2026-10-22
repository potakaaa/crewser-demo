# Switching between projects in the Crewser crew app

Status: proposal for the production app. The clickable prototype (mock data, no backend) shows only: the project switcher, drafts and logged hours kept per link, the expired and revoked states, the "Acting as" banner and the confirm step before sending hours for a colleague. Everything else here (the wallet, adding and validating links, status checks, "Request a new link", "Remove from this phone", delegation grants and the security measures) is proposed and not built.

## Summary

Crew members often work on two productions at the same time, and a department member (a 1st AC for the camera team, a gaffer for lighting, a key grip for grip) is often the one who enters hours for colleagues. Today every person on every project gets their own personal access link by SMS. The proposal is to keep that model and let the phone hold several links at once, with a switcher to choose which one is active.

- **Wallet and switcher:** the wallet and the switcher need no backend change. Each link stays a separate credential and the app only decides which one to send. A few supporting items do need small backend or message changes; they are listed in the table below.
- **Entering hours for a colleague:** this works today with no backend change if the colleague forwards their link, but it is a weak form of delegation (see "Entering hours for a colleague"). We recommend shipping it as phase 1 only with the colleague's agreement, and building a proper delegation grant as phase 2, which does need a backend change.
- **Security:** the main risks are tokens leaking through the browser, link previews or backups. The measures are listed in "Security notes". Nothing in this document makes a stored link more secure than the SMS it came from, so it is a convenience feature with sensible hygiene, not extra protection.

| Part | Backend or message change needed? |
|---|---|
| Wallet and project switcher (own links) | No |
| Validating a link before adding it, status checks | No, if `GET /crew/me` already exists and returns 401/410 as described below |
| Hours for a colleague by forwarded link (phase 1) | No (but needs a legal and data-protection review, see below) |
| SMS template and web app: link with the token in the URL fragment | Yes, small: the SMS text and the web app's link handling change |
| Telling "revoked" from "expired" | Yes, small: the API must answer differently (for example `410` with a reason) |
| Self-service "Request a new link" | Yes: proposal is phone number plus one-time code, so a crew member can get a fresh link without calling production |
| Delegation grant with audit trail (phase 2) | Yes |
| Idempotent hour submissions | Only if repeat submissions for the same day are not already treated as an update |

## What the user sees

- A project switcher at the top of the app lists every link on the phone: project, production, whose hours the link is for, and when it ends.
- Links that end soon show a warning ("ends in 3 days"). Expired links are greyed out. A link that production revoked is shown differently from one that simply ran out, so the user knows whether to wait or to ask.
- Choosing a link switches the app to that project and person. In the production app that means dashboard, calendar, documents and contacts. In the prototype only the project name, the logged hours and the Log sheet draft change; documents and contacts are shared mock data. Anything half-typed for the previous person stays saved as a draft with that person (see "Drafts").
- Links that belong to a colleague carry the colleague's name wherever hours are shown, so it is always clear whose hours are being entered. The prototype does this with the "Acting as" banner and the "Hours for …" title of the Log sheet.

## The local wallet

The app keeps a small "wallet" on the device. Each entry holds only what is needed to call the API:

| Field | Purpose |
|---|---|
| `entryId` | Random local id for this entry. Drafts and queued sends belong to this id, not to the token |
| `projectId` | Which production the link belongs to |
| `crewMemberId` | Which person the link belongs to |
| `token` | The secret from the SMS link |
| `expiresAt` | When the link stops working, as the server last reported it |
| `status` | `active`, `expired` or `revoked` as the server last reported it, or `needs_new_link`, which the app sets itself (shown as "needs a new link") after a second `401`. The server never sends it; the app keeps a per-link "401 seen once" flag, see below |

Display data (project name, person name, department) is cached next to it so the switcher works offline. It is never treated as authoritative.

## Adding a link

1. The user opens an SMS link, or pastes one.
2. The app reads the token and **validates it with the server** before storing anything. The API address is not taken from the link. The app only talks to an allowlisted Crewser origin, so a crafted link cannot point the app at another server.
3. The server answers with the person and project. The app asks the user to confirm: "Add Slate Bianca on The Last Ferry?" Nothing is saved until the user says yes.
4. The entry is stored. Entries are de-duplicated on `projectId` + `crewMemberId`. If the same person on the same project is added again (a new SMS, or someone taps an old one), the app validates both tokens and keeps the one the server reports as active. If both are valid, the later expiry wins as a tie-break only. A token the server reports as expired or revoked is never kept, however late its date.

## Checking that a link still works

- When the app starts and when it returns to the foreground, it checks each link in the background with one cheap call, for example `GET /crew/me`, sent with that link's token.
  - `200`: the link is valid. Refresh the cached display data and the expiry date.
  - `410`, or an explicit "revoked" response: **final**. The link is dead. Mark it revoked (or expired when the server says it ran out) and do not retry.
  - `401`: not final at first. It can mean a mistyped or rotated token or a temporary state. Re-check once on the next start. After a second `401` the link is shown as "needs a new link" and (proposed) offers "Request a new link". The prototype has no such action; a blocked link only says "Ask production for a new link".
  - Network error or `5xx`: keep the previous status. Being offline never counts as expired.
- "Request a new link" is open to anyone who can type a phone number, so it should be built to resist abuse. The proposal: requests are rate-limited per phone number and per device, the one-time code is short-lived and single-use, and the reply is the same whether or not the number belongs to a crew member. These are design requirements for the backend, not existing behaviour. They keep the endpoint from being used to guess crew phone numbers or to send unwanted SMS.
- The device clock only drives the warning text ("ends in 3 days"). The server decides whether a link works.
- Checks are rate-limited: at most one per link every few hours, spread out rather than fired all at once, with back-off after errors. Only the active link loads full data; the others are only checked.

## Entering hours for a colleague

### Phase 1: forwarded link (works today, no backend change)

The colleague forwards their personal link to the person who will enter their hours, and that person adds it to their wallet like any other link. The app sends hours with the colleague's token, so the server sees the same request as if the colleague had sent it.

What this means, plainly:

- **The link is the colleague's full identity.** Whoever holds it can see and change everything that person can, including their master data (payroll and personal details), not only their hours.
- **Production cannot see who really entered the hours.** The server only knows the colleague's token was used.
- **There is no consent step.** Sending the link is the only agreement.
- **It cannot be revoked separately.** Cutting off the delegate means revoking the colleague's own link, which also cuts off the colleague.

Phase 1 is acceptable only with the colleague's explicit agreement, for a trusted person on the same team. It also needs a legal and data-protection review before launch: the terms of use must allow sharing a link this way, and handing someone access to a colleague's payroll data is a data-protection question for production and Crewser, not only a technical one. The app helps by labelling these links clearly and by asking for confirmation before submitting (see below).

### Phase 2: a proper delegation grant (needs a backend change)

Production or the colleague creates a grant that allows one named crew member to act for another. The grant:

- is limited to "view and submit hours" and cannot read master data,
- has its own end date and can be revoked on its own, without touching the colleague's link,
- is written to the audit log as "entered by Mag Samir for Slate Bianca",
- sends the colleague a notification when it is created and when it is used.

The delegate then holds a token of their own with that restricted scope, and the app lists the grant in the switcher just like a link. This is the recommended end state for production use.

### Rules the app follows in both phases

- Hours are only ever sent with the token of the person they are for. Every screen that edits hours works on one selected entry.
- When the person is not the user, the app confirms before sending. In the prototype the first tap on Submit shows "You are sending hours for Slate Bianca, not for yourself." and changes the button to "Submit for Slate Bianca"; the second tap sends.
- The app never mixes tokens in one request and never sends a token to any origin other than the allowlisted Crewser one.

## Drafts and sending

- Each draft belongs to a wallet `entryId` (the random local id above), is saved automatically as the user types, and is **kept when the user switches** to another link.
- A queued send looks up its token from its own wallet entry at the moment it is sent. It never uses whichever link happens to be active.
- Switching link cancels only reads that belong to the previous link. Writes already on their way are allowed to finish, or are retried later with the same key, so a switch can never lose an hours entry.
- Each submission carries an idempotency key made from the entry, the date and the draft revision (or a hash of the content). A retry of the same send after a bad connection cannot create a second submission. A resubmit on the same day with changed content has a new key and counts as an update. If the API does not already treat a repeat submission for the same day as an update, accepting this key is a small backend addition.
- An expired link that still has unsent drafts stays in the list and (proposed) offers "Request a new link". The drafts are not lost.
- Removing a link asks whether to keep or discard its unsent drafts. Drafts that are kept are parked: stored encrypted, kept for a limited time (for example 30 days), and they cannot be sent until the link has been added again.

## Removing a link

(Proposed; the prototype has no remove action.) "Remove from this phone" deletes the wallet entry and every cached item for it: names, phone numbers, call sheets, notes. It does not revoke the link on the server, so the user can add it again from the SMS. Production can revoke a link at any time (for example when someone leaves the crew); the next check then returns `410` and the app marks it revoked.

## Security notes

- **Where the token travels.** An SMS link with the token in the URL fragment (`https://go.crewser.app/#token=...`) is better than one in the query string, because the browser does not send the fragment to servers or proxies, so it stays out of server logs. It is not secret from scripts running on the page or from some link previews. That calls for no third-party scripts on the page, a strict Content Security Policy, and removing the fragment with `history.replaceState` as soon as it has been read. Moving the SMS link from a query string to a fragment is itself a change to the SMS template and the web app.
- **Never in a URL.** API calls send the token in a header, not in the address.
- **Storage on the web.** IndexedDB can be read by any script that runs in the page, so a cross-site-scripting bug would expose every stored token. On the web this needs a strict CSP, or tokens kept in an HttpOnly cookie scoped per project instead of in script-readable storage. Browser storage should be treated as the weakest place a token can live.
- **Storage on phones.** On iOS use the Keychain with "this device only" accessibility. On Android use Keystore-backed encrypted storage and exclude it from cloud backup and device transfer.
- **Cached data counts too.** Names, phone numbers, call sheets and notes are as sensitive as the token. They get the same protection and are wiped when the link is removed.
- **Logs and reports.** Tokens are never written to console logs, analytics or crash reports, and are redacted from server logs and error reports. Where a log needs to refer to a link, it uses the random wallet `entryId`, never the token or any hash of it.
- **Optional app lock.** An optional app lock or biometric prompt protects a phone that is lent out, lost or unlocked.
- **Expiry and revocation.** Tokens have an end date set by production and can be revoked on the server. The device clock never overrides the server.

## Optional later improvements

1. **Device-bound session.** A one-time exchange turns the SMS link into a longer-lived session token tied to the device, so the SMS link itself can be single-use and short-lived.
2. **Account linking.** Optionally link several crew links to one Crewser account (email or phone) to restore the wallet on a new phone. Links stay separate credentials underneath.
3. **Push reminders per project,** for example "day not submitted", routed by link.
