# Reading PhraseFlow Atlas

This guide is for a developer with about two or three years of experience. The app uses React, Next.js API routes, TypeScript, and MongoDB. There is no separate Express server, custom framework, repository layer, or dependency injection container.

## Start with one working feature

Read these files in order:

1. `src/app/dashboard/page.tsx` checks the session and renders the learning page.
2. `src/components/DashboardClient.tsx` stores the selected options and handles the buttons.
3. `src/app/api/sentences/today/route.ts` receives the request, checks permissions, and calls the sentence service.
4. `src/lib/sentences.ts` checks the allowance, generates sentences, and saves delivery.
5. `src/lib/ai/service.ts` sends requests to the configured AI providers.
6. `src/models/Sentence.ts` describes a sentence stored in MongoDB.
7. `src/lib/sentence-view.ts` selects the public fields returned to the browser.
8. `src/components/SentenceCard.tsx` displays those fields and provides save/listen buttons.

When reading a function, first find its inputs, then its database/API calls, then its return value. You do not need to understand every file before changing a small feature.

## What each folder does

| Folder | Responsibility | Example |
| --- | --- | --- |
| `src/app` | Pages, layouts, and HTTP routes | `app/login/page.tsx` |
| `src/components` | React UI and button handlers | `AdminPanel.tsx` |
| `src/lib` | Business rules and service functions | `sentences.ts` |
| `src/models` | MongoDB fields and indexes | `User.ts` |
| `src/types` | Plain shared data shapes without runtime code | `learning.ts` |
| `scripts` | Tests and build support | `test-sentence-flow.cjs` |

Keep small helpers beside the feature that uses them. Create a shared helper only when multiple places genuinely need the same behavior. Do not add a new layer for every function.

## Frontend: state, events, rendering

`DashboardClient` has three jobs: load initial data, handle requests/save actions, and render the results. Its two small display components are:

- `LearningSelect`: the same labeled select for topic, level, and frequency.
- `TopicProgressList`: the progress buttons and the currently expanded percentage.

`SentenceView`, `LearningOption`, and `TopicProgress` are plain types in `types/learning.ts`. Components do not import database models.

`useState` stores a value that changes the screen. `useEffect` loads data when a component mounts. The dashboard's `useCallback` keeps the loader functions stable because the effect depends on them and event handlers reuse them. `useMemo` keeps the saved-sentence grouping and translation context from being rebuilt unnecessarily. These hooks are used in their existing places; they are not a requirement for every new function.

The saved page groups items with an ordinary `for...of` loop. Translation lookup uses a named `translateText` function, so language persistence and text lookup can be read separately.

## Backend: request to response

An API route normally follows this order:

1. Verify the session and required role.
2. Connect to MongoDB.
3. Apply the request limit when needed.
4. Validate incoming data with Zod.
5. Call the feature logic.
6. Return JSON, or pass errors to `handleRouteError`.

The sentence formatter is shared by today's sentences and saved sentences. MongoDB uses `_id`; the UI gets `id` as a string. Hashes and provider bookkeeping stay on the server. Today's GET handler restores delivery order with a lookup map and a normal loop.

## Daily sentences: three clear steps

The public function `getTodaySentencesForUser` reads from top to bottom:

1. `getOrCreateDailyUsage` loads today's counter and checks the 20-sentence limit.
2. `getPreviouslyDeliveredTexts` and `buildUniqueSentences` produce a complete batch without repeats.
3. `saveBatchDelivery` saves the delivery and increases the counter together.

These helpers remain in one file. There are no extra service classes or generic repositories to follow.

Generation happens before charging the allowance. A failed or incomplete generation does not consume a batch. A failed delivery rolls back the counter update. If another request changed the counter, the service returns `retry` and the client reloads today's state.

## Database logic that must remain atomic

Two browser tabs can send requests at the same time. A simple JavaScript check followed by a separate write is not enough to enforce a shared limit.

`saveBatchDelivery` therefore uses a MongoDB transaction. Both the allowance update and delivery records succeed, or both are rolled back. The filter includes the previously read counter so only one concurrent request can use that version. Keep these writes together.

`rate-limit.ts` uses a MongoDB update pipeline. Its named expressions make the calculation readable:

- `previousCount`: the existing count, or zero for a new record.
- `previousExpiry`: the existing expiry, or an old date for a new record.
- `windowExpired`: whether a new window should begin.
- `nextCount`: one for a new window, otherwise the old count plus one.
- `nextExpiry`: a new expiry only when the window resets.

MongoDB evaluates them in a single update. `$ifNull` means "use the fallback when missing"; `$cond` is "if / then / else". TTL deletes old records later; it is not the mechanism that decides whether the current request is allowed. Error code 11000 means a unique key already exists, often because another request inserted it first.

## Login and authorization

`lib/auth.ts` handles password hashing, JWT signing, cookies, and page/API guards. `getSession` validates the signature, username, role, and identifier in separate checks. Do not replace signature verification with merely decoding the token.

The environment administrator is checked first at admin login. MongoDB admin accounts are also supported. Only administrators may create accounts; the form supports user or admin roles. Account names are compared exactly as entered.

Cookies are browser-session cookies. JWTs still have a seven-day upper bound, and some browsers restore session cookies after reopening. Logout deletes the cookie. Changing environment admin credentials does not revoke an already signed session.

## Other features

- `lib/options.ts`: stored learning options with defaults.
- `lib/landing.ts`: fixed public Greek sentences; no weekly rotation.
- `lib/ai/service.ts`: provider-specific requests and fallback order. Separate request functions are necessary because the providers use different JSON formats.
- `lib/crypto.ts`: decrypts stored provider keys. Keep secrets on the server.
- `lib/db.ts`: reuses a database connection and resets failed connection attempts.
- `SentenceCard.tsx`: device speech only; no audio storage.
- `api/progress`: saved/delivered percentage per topic, not a language proficiency score.

## Making a small change

To add a default topic, start with `lib/constants.ts`. Stored options in MongoDB take precedence, so also check which source your environment uses. Add its Arabic/Greek display text in `lib/ui-phrases.ts` if needed.

To change how a sentence card looks, edit `SentenceCard.tsx` and `app/globals.css`. Do not edit the sentence model unless the stored data needs to change.

To change daily batch size, inspect `lib/constants.ts`, the sentence flow, the user-facing allowance messages, and the quota tests together. Keep the server as the authority.

Use descriptive names, regular `if` statements, early returns, and short functions with one purpose. Comments should explain a business rule or a non-obvious reason, not repeat every assignment. Keep comments in English.

## Verification and limitations

Run `npm test` and `npm run build`. The tests cover login roles, session validation, daily quota/concurrency, shared request limits, provider failures, Greek-only learning, translation references, and sentence response formatting/restoration.

Tests mock MongoDB and provider boundaries. They do not prove that live provider keys or Atlas transactions work. No production database migration is needed for this readability refactor; stored records, route URLs, daily limits, and UI languages remain the same.
