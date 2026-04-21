# Email Unsubscribe App — Technical Plan

## Concept

A "Tinder for email unsubscribing" web app. The app connects to a user's Gmail, scans for newsletter and marketing list subscriptions, deduplicates them by sender, and presents each one as a card. The user swipes (or taps) "keep" or "unsubscribe" on each card. Unsubscribing happens automatically by hitting the `List-Unsubscribe` header present in most marketing emails.

## Target Platform & Scope

- **Platform:** Web app (browser-based)
- **Email provider:** Gmail (via Gmail API)
- **Users:** Initially a personal tool for one user; designed to be shareable later
- **Post-unsubscribe cleanup:** Out of scope — the app only handles unsubscribing, not archiving or deleting old emails from that sender

---

## Recommended Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js** | Single project for React frontend + API routes; no separate backend deployment |
| Auth | **NextAuth / Auth.js** | Handles Google OAuth and token refresh out of the box |
| Database | **SQLite** (via Drizzle or Prisma) | Simple, no infrastructure; upgrade to Postgres when going multi-user |
| Frontend | **React** with a card-swipe library (`react-tinder-card` or `framer-motion`) | Provides the "Tinder" swipe UX |

---

## How It Works

### 1. Gmail Scanning

Use the Gmail API to search for subscription emails. The query `unsubscribe newer_than:1y` catches the vast majority of marketing emails without scanning the entire inbox. Fetch message **headers only** (not full bodies) to keep it fast. The key headers to extract are:

- `List-Unsubscribe` — contains an HTTP URL and/or mailto link for unsubscribing
- `List-Unsubscribe-Post` — indicates support for RFC 8058 one-click unsubscribe
- `From` — sender display name and email address
- `Subject` — for showing a sample on the card

### 2. Deduplication

Group emails by sender address (or by `List-Unsubscribe` value for more accuracy). Each group becomes a single card. For each card, store:

- Sender name and address
- Total email count from that sender
- Most recent subject line
- Most recent date
- The `List-Unsubscribe` URL/mailto value

### 3. Card UI

Present a stack of cards, one per subscription. Each card displays the sender name, email count, a sample subject line, and the most recent date. The user swipes right (or taps "Keep") to keep the subscription, or swipes left (or taps "Unsubscribe") to remove it.

### 4. Unsubscribe Execution

When the user chooses to unsubscribe, the backend processes it in this priority order:

1. **One-click HTTP POST** — If `List-Unsubscribe-Post` header is present, send an HTTP POST to the `List-Unsubscribe` URL with `List-Unsubscribe=One-Click` in the body (per RFC 8058). This is the cleanest method.
2. **HTTP GET/redirect** — If the `List-Unsubscribe` header contains an HTTP URL but no POST header, open that URL. Many unsubscribe links work via GET.
3. **Flag for manual action** — If the header is mailto-only or missing entirely, mark the subscription as "needs manual action" so the user knows to handle it themselves.

Process unsubscribe actions in a background queue so the swipe UI stays responsive.

---

## Data Model

One primary table: **subscriptions**

| Column | Type | Description |
|--------|------|-------------|
| id | int (PK) | Auto-increment |
| sender_address | string | Email address of the sender |
| sender_name | string | Display name of the sender |
| unsubscribe_url | string (nullable) | The `List-Unsubscribe` HTTP URL |
| unsubscribe_mailto | string (nullable) | The `List-Unsubscribe` mailto address |
| has_one_click | boolean | Whether `List-Unsubscribe-Post` is present |
| email_count | int | Number of emails from this sender |
| latest_subject | string | Most recent email subject line |
| latest_date | datetime | Date of most recent email |
| decision | enum | `pending`, `keep`, `unsubscribe` |
| unsub_status | enum | `not_attempted`, `succeeded`, `failed`, `manual_needed` |
| created_at | datetime | When the record was created |
| updated_at | datetime | When the record was last updated |

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...nextauth]` | GET/POST | Google OAuth sign-in and token management (handled by NextAuth) |
| `/api/scan` | POST | Calls Gmail API, fetches headers, deduplicates, upserts into subscriptions table |
| `/api/subscriptions` | GET | Returns pending subscriptions for the card stack |
| `/api/decide` | POST | Records the user's keep/unsubscribe decision; if unsubscribing, triggers the unsubscribe HTTP request |

---

## Gmail API Setup

### OAuth Scopes Required

- `gmail.readonly` — for scanning message headers
- `gmail.modify` — optional, only if we later add cleanup features

### Google Cloud Project Setup

1. Create a project in Google Cloud Console
2. Enable the Gmail API
3. Create OAuth 2.0 credentials (web application type)
4. Add authorized redirect URIs for NextAuth
5. For personal use: no verification needed (stays in "testing" mode with your account added as a test user)
6. For public release: must go through Google's OAuth verification process including a security audit for sensitive scopes

---

## Build Order

| Step | What to Build | Why This Order |
|------|---------------|----------------|
| 1 | Google OAuth sign-in | Foundation — everything depends on having a valid Gmail token |
| 2 | Gmail API scanning + deduplication | Core value — this is the hard part and proves the concept works |
| 3 | Basic list UI with Keep / Unsubscribe buttons | Functional MVP — no swipe animations yet, just buttons |
| 4 | Unsubscribe action (HTTP calls to List-Unsubscribe URLs) | Completes the core loop |
| 5 | Persist decisions to database | Enables session continuity and history |
| 6 | Swipe card UI with animations | Polish — adds the "Tinder" feel |
| 7 | History / review screen | Nice-to-have — lets the user see past decisions |

Steps 1–5 are the functional product. Steps 6–7 make it feel like the vision.

---

## Known Edge Cases & Gotchas

- **Confirmation pages:** Some unsubscribe links lead to a page with a confirmation button instead of actually unsubscribing on the initial request. Track "attempted" vs "confirmed" and surface these to the user.
- **Missing headers:** Some senders (especially small businesses) don't include `List-Unsubscribe`. Use a fallback heuristic — emails from `noreply@`, `marketing@`, or containing "unsubscribe" in the body are likely subscriptions even without the header.
- **Mailto-only unsubscribe:** Some older lists only support unsubscribing via email. These need to be flagged for manual action unless we add the ability to send an unsubscribe email on the user's behalf (adds complexity and requires `gmail.send` scope).
- **Rate limiting:** Gmail API has quota limits. Batch header fetches and respect rate limits to avoid hitting 429 errors during the scan phase.
- **Token refresh:** Google OAuth tokens expire after 1 hour. NextAuth handles refresh automatically, but make sure long-running scan operations handle token expiry gracefully.

---

## Future Enhancements (Out of Scope for v1)

- Post-unsubscribe email cleanup (archive/delete old emails from that sender)
- Block sender option
- Stats dashboard ("You unsubscribed from 43 lists!")
- Multi-user support with Postgres and Google OAuth verification
- Mobile-optimized PWA version
- Scheduled re-scans to catch new subscriptions
