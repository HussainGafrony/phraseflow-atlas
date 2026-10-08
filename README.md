# PhraseFlow Atlas

Language learning with German, English and Greek sentences and Arabic translations. The interface supports Arabic (default) and Greek.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI`, `SESSION_SECRET` (at least 32 characters), `APP_ENCRYPTION_KEY`, `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
3. Run `npm install`, then `npm run dev`.

The administrator is read **only from server environment variables**, never created in MongoDB. Username: 3–40 characters, case insensitive; password: 8–120 characters, case sensitive. Changing either credential invalidates existing administrator sessions. Do not prefix these variables with `NEXT_PUBLIC_` or commit real credentials. On Vercel set them in the project environment and redeploy for changes to take effect.

There is no setup page or seed-admin command. Old database admin accounts cannot sign in. MongoDB is still required for rate limits and creating user accounts.

## Routes and permissions

| Route | Access |
| --- | --- |
| `/` | Public weekly sentences |
| `/login` | User login |
| `/user` | Alias: user dashboard, or user login when signed out |
| `/dashboard`, `/saved` | User session required |
| `/admin/login` | Environment administrator login |
| `/admin` | Environment administrator; create ordinary accounts only |
| `/api/admin/users` | Administrator POST only; GET/PUT/DELETE unsupported |
| Unknown routes, including `/admin/setup` | 404 |

Wrong-role page requests redirect to that account's home. APIs reject wrong roles. Login redirects use fixed internal paths. Editing a URL does not grant access. Logout clears the session and returns to the public page.

## Features and configuration limits

- Daily five-sentence batches: 5 + 5, unlock, 5 + 5, capped at 20 using a MongoDB transaction.
- Saved sentences grouped by day, restoration of today's unsaved sentences, duplicate checks and per-topic progress.
- Shared MongoDB rate limits for login, generation, unlock, audio and account creation.
- Existing database AI provider profiles and encrypted audio settings continue to work.
- Audio generated once and stored in private Vercel Blob, with authenticated playback; device voice fallback when unavailable.
- Weekly public sentence rotation and a curated fallback; `CRON_SECRET` protects the scheduled route.

The admin panel intentionally **has no provider, audio, unlock-code, learning-options or public-sentence settings**, no user list and no edit/delete/reset-password actions. Existing database configuration remains in use, but new installations need that configuration provisioned separately. AI/API keys are **not** automatically read from new environment variable names. No enabled provider means no new generated sentences; no active stored unlock code means the extra ten daily sentences cannot be unlocked. See [FEATURE_STATUS.md](FEATURE_STATUS.md) for the full audit.

`MONGODB_DB_NAME` overrides the database in `MONGODB_URI`; fallback is `phraseflow-atlas`. `APP_TIME_ZONE` defines the daily reset. `BLOB_READ_WRITE_TOKEN` may supply the private Blob token; audio provider settings still come from MongoDB. Preserve `APP_ENCRYPTION_KEY` to decrypt existing settings.

## Verification

`npm test` and `npm run build` check behavior, types and build output. Automated tests use mocked MongoDB/AI/Blob boundaries; they do not establish that production credentials or Atlas transactions work. See [CODE_GUIDE.md](CODE_GUIDE.md) for feature locations and comments.
