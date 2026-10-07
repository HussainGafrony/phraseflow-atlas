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
- MongoDB models ready for MongoDB Atlas.
- AI provider settings for OpenAI, Gemini, Claude, DeepSeek, and Grok.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill:
   - `MONGODB_URI`
   - `SESSION_SECRET`
   - `APP_ENCRYPTION_KEY`
3. Install dependencies:

```bash
npm install
```

4. Create the first admin:

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=your-password npm run seed:admin
```

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
- `/admin` admin panel

## AI providers

AI provider secrets are entered from `/admin` in the AI providers tab. The API key is saved encrypted with `APP_ENCRYPTION_KEY`. If no provider is enabled, the app uses fallback generated training sentences so the workflow can still be tested.

## Audio

Each sentence has an `audioUrl` field. If an enabled provider has an audio endpoint that returns `{ "audioUrl": "..." }`, the app saves that link once. Until a real audio service is connected, the Listen button falls back to the browser speech engine.
