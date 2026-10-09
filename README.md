# PhraseFlow Atlas

Greek sentence learning with Arabic translations. The interface supports Arabic (default) and Greek.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI`, `SESSION_SECRET` (at least 32 characters) and `APP_ENCRYPTION_KEY` for existing AI provider secrets.
3. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to enable an environment administrator. Existing MongoDB administrator accounts can also sign in.
4. Run `npm install`, then `npm run dev`.

Names are stored and compared exactly, including case and spaces. Username/password length restrictions have been removed; values must still be non-empty. Old normalized names remain stored as before, so enter those exact existing names. Account creation supports `user` and `admin`, and only an authenticated administrator can create either. The environment administrator name is no longer reserved for database accounts. On admin login, matching environment credentials are checked first, followed by the database administrator account.

Never commit real credentials or expose secrets using a `NEXT_PUBLIC_` prefix.

## Current behavior

- Greek is the only language accepted for new learning requests. There is no learning-language selector or English default.
- Four five-sentence batches per user per day, capped at 20 using a MongoDB transaction. No unlock code, ten-sentence gate or unlock API.
- Save sentences, restore today's unsaved sentences, review saves grouped by day and view per-topic saved/delivered percentages.
- Listening uses the browser/device speech service only. The app does not call a speech-generation API, upload audio, save audio URLs, or use Vercel Blob.
- Old saved sentences remain readable and can still use device pronunciation. Existing remote audio objects and database records were not deleted by this code change; they are no longer used by the application.
- The public page shows four fixed Greek sentences: active stored Greek content, completed with a fixed Greek set if needed. No weekly rotation, AI generation for the public page, cron endpoint or cron configuration.
- UI remains Arabic/Greek, with local preference persistence and RTL/LTR.

## Sessions and routes

Cookies have no `maxAge` or `expires`: they are browser-session cookies. JWT signature verification, role checks, HttpOnly, SameSite and production Secure flags remain. JWTs expire after seven days as a server-side upper bound. Some browsers restore session cookies when restoring a previous session; this is not a promise of deletion on every browser close. Logout explicitly deletes the cookie. Changing administrator credentials does not automatically revoke existing signed sessions anymore.

| Route | Access |
| --- | --- |
| `/` | Fixed public Greek sentences |
| `/login` | User login |
| `/admin/login` | Environment or database administrator login |
| `/user` | Redirect to user dashboard or login |
| `/dashboard`, `/saved` | User session required |
| `/admin` | Create user or administrator accounts |
| `POST /api/admin/users` | Administrator only; no account listing/editing/deletion |
| Unknown or removed routes | 404 |

## Services and environment

AI text generation still uses enabled, encrypted MongoDB provider profiles with priority fallback across OpenAI, Gemini, Claude, DeepSeek and Grok. There is no admin provider-settings interface. A new installation must provision those profiles separately. No enabled provider means generation fails without consuming the allowance.

`MONGODB_DB_NAME` overrides the URI database; otherwise the URI name or `phraseflow-atlas` is used. `APP_TIME_ZONE` defines daily boundaries. `NEXT_PUBLIC_APP_NAME` sets the display name. `APP_ENCRYPTION_KEY` must remain compatible with saved provider secrets. `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN` and `ADMIN_SETUP_TOKEN` are no longer used.

MongoDB is needed for login rate limiting even for the environment administrator. Remaining limits: login 12/15 minutes per IP, generation 8/minute per user, account creation 20/minute per administrator.

## Verification

`npm test` and `npm run build` check behavior, types and build output. Tests mock database and provider boundaries; production credentials and Atlas transactions still need live verification. See [CODE_GUIDE.md](CODE_GUIDE.md) and [FEATURE_STATUS.md](FEATURE_STATUS.md).
