# PhraseFlow Atlas

Daily sentence learning app for German, English, and Greek with Arabic translations.

## What is included

- Public landing page with weekly editable sentences.
- User login with username and password.
- Daily sentence flow: 5 + 5 sentences, admin unlock code, then 5 + 5 more.
- 20 sentences per user per day.
- Saved sentences page separated by day.
- Topic progress indicators.
- Admin panel for users, unlock code, AI provider settings, and landing sentences.
- First-admin setup page at `/admin/setup` protected by `ADMIN_SETUP_TOKEN`.
- Editable topics, levels, and frequency options from the admin panel.
- Arabic and Greek UI, with Arabic as the default and right-to-left support.
- MongoDB models ready for MongoDB Atlas.
- AI provider settings for OpenAI, Gemini, Claude, DeepSeek, and Grok.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill:
   - `MONGODB_URI`
   - `SESSION_SECRET`
   - `APP_ENCRYPTION_KEY`
   - `ADMIN_SETUP_TOKEN`
3. Install dependencies:

```bash
npm install
```

4. Create the first admin:

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=your-password npm run seed:admin
```

Or use `/admin/setup` after configuring `ADMIN_SETUP_TOKEN`. The setup page closes after the first admin exists.

5. Start development:

```bash
npm run dev
```

## Routes

- `/` public page
- `/login` user login
- `/dashboard` user learning dashboard
- `/saved` saved sentences
- `/admin/login` admin login
- `/admin/setup` first-admin setup
- `/admin` admin panel

## AI providers

AI provider secrets are entered from `/admin` in the AI providers tab. The API key is saved encrypted with `APP_ENCRYPTION_KEY`. If no provider is available, the app reports an error without charging the daily allowance. It never substitutes fabricated teaching sentences or translations.

## Audio

The admin Audio and storage tab configures an OpenAI-compatible speech service and a **private** Vercel Blob store. API keys and the Blob token are encrypted in MongoDB. A dedicated audio model and voice are separate from the text model. Use Save and test audio to generate, store, and play a real sample.

Audio files are cached by text/language/model/voice. MongoDB stores the asset record; the application serves a stable authenticated audio URL. Missing audio can be generated on first playback. Without configured credentials the UI identifies its device-voice fallback.

## Configuration

- Database name: `MONGODB_DB_NAME` overrides the URI database; otherwise the URI path is used, falling back to `phraseflow-atlas`.
- `ADMIN_SETUP_TOKEN`: required for production first-admin setup; the setup endpoint closes after an admin exists.
- `CRON_SECRET`: protects the daily scheduled check that rotates public sentences weekly. A curated weekly fallback also works on page access without AI keys.
- Optional `BLOB_READ_WRITE_TOKEN`: private store token; can instead be entered in the admin audio settings.

## Verification and code guide

Run `npm test`, `npm run lint`, and `npm run build`. Tests mock MongoDB, AI providers, and Blob; live credentials and MongoDB Atlas transaction verification are still required before production acceptance.

See [CODE_GUIDE.md](CODE_GUIDE.md) for the Arabic feature guide, data flow, configuration, and rate limits. Feature modules contain Arabic comments.
