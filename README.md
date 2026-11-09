# SocialPilot AI

A Next.js App Router application for brand onboarding, content drafts, approval, scheduled delivery, media, and reviewed comment replies. This is an implemented MVP, with the limitations below; it does **not** satisfy every item in the supplied production specification yet.

## Run a local evaluation

Requires Node.js 22.19+ and npm. From this directory:

```powershell
npm ci
npm run db:generate
$env:PORT = '4173'
npm run demo
```

Open `http://localhost:4173`, register, and complete onboarding. The optional evaluation harness starts a persistent local **PGlite PostgreSQL-compatible database**, applies the actual SQL migration, and runs Next.js. Data lives outside the source in `../../work/socialpilot-demo-db`; override `LOCAL_DEMO_DIRECTORY` to choose another path. This is a local testing convenience, not a production database substitute. It binds its database to loopback only. Sessions are invalidated when the harness restarts because its random authentication secret is held in memory.

The demo still needs a durable worker for generation and simulated scheduled deliveries. In another terminal:

```powershell
npx inngest-cli@latest dev -u http://localhost:4173/api/inngest
```

Cron functions drain the database outbox approximately once per minute. Pending jobs remain visible when the worker is stopped. Do not interpret a configured environment variable as proof that its provider is running.

No social API publishing or reply endpoint is called in demo mode. Generated demo drafts, account names, audit events, and publications are labelled as demo activity. The public homepage's product illustration is also explicitly labelled sample content.

## Set up Neon and live services

1. Create a Neon project through your organization’s permitted provisioning path. In this build session, the connected Neon organization rejected project creation with `organization is managed by Vercel`. No Neon database was created or migrated here.
2. Copy `.env.example` to `.env` and replace placeholders. Use a **pooled** Neon URL in `DATABASE_URL` and an **unpooled** URL in `DIRECT_URL`, both with `sslmode=require`. This project pins **Prisma 6.19.0**, which reads both URLs in `prisma/schema.prisma`; it intentionally does not use Prisma 7 adapter configuration.
3. Set `BETTER_AUTH_SECRET` to a cryptographically random value of at least 32 characters. Set `BETTER_AUTH_URL` and `APP_URL` to the same canonical application origin. Use HTTPS for production.
4. Set `APP_MODE=live` for live services, or `demo` for database-backed demonstrations. Use **separate databases, storage buckets, and Inngest environments** for demo and live. A workspace's persisted mode must match its deployment.
5. Run:

```powershell
npm ci
npm run db:generate
npm run db:migrate
npm run build
npm start
```

`db:migrate` runs `prisma migrate deploy` against the included SQL migration. For schema changes, use `npx prisma migrate dev --name descriptive_name` on a development Neon branch, commit the resulting migration, and deploy it before restarting the app. Never use `db push` as a production migration process.

Use `npm run dev` during development. The default port is 3000; in this environment it was unavailable, so the verified local evaluation port is 4173.

### Authentication and recovery

Better Auth's documented Prisma adapter owns password hashing and session persistence. The schema includes User, Session, Account, Verification, and RateLimit models. Passwords require 12–128 characters. Secure cookie behavior follows Better Auth's canonical URL and production configuration.

Set `RESEND_API_KEY` and a verified `EMAIL_FROM` sender for password reset delivery. Without them the recovery screen gives generic guidance and no email is sent. Email verification, invitation email delivery, account export, and self-service account deletion are not implemented. Owners can add an **already registered** user to their workspace and assign admin, editor, or viewer roles.

### AI providers

Set `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, and `OPENAI_IMAGE_MODEL`. Text uses a server-only provider interface, JSON response format, and Zod output validation. Generation reserves workspace usage in PostgreSQL before queueing. Demo plans use labelled deterministic drafts instead of calling the AI service.

Live plans include the brand profile, unexpired verified knowledge, products, and recent topics. AI output remains untrusted editorial material: review factual claims before approval. Background illustrations are generated without product depictions, text, or logos. Actual product images must be uploaded for accuracy. Caption shortening is exposed in the editor and never saves automatically. The provider operation schema also supports other rewrite instructions, but those controls are not yet exposed in the UI.

### Object storage and graphics

Set `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` for a private S3-compatible bucket (including R2). Provide put/get/delete access only to the relevant bucket. Enable the storage provider's normal encryption at rest and lifecycle policy.

Uploads accept PNG, JPEG, and WebP up to 10 MB and 25 million decoded pixels; Sharp checks the actual image and re-encodes it to PNG. PostgreSQL stores tenant ownership, dimensions, size, MIME type, storage key, source, and optional prompt. The browser receives authenticated, short-lived signed media redirects; Instagram gets a one-day signed fetch URL for publishing. Do not configure the bucket as public.

The template renderer exports 1080×1080 PNGs for tips, spotlights, announcements, offers, FAQs, and supplied testimonials. Text is escaped before SVG rendering. Offer templates require an active verified offer. This first renderer supports headline, body, brand name, and colour; draggable photo/logo placement and a full template designer remain unfinished. Font/style preferences are saved but do not yet alter template rendering.

### Durable execution

Use Inngest Cloud with `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`; omit `INNGEST_DEV` in production. Register the deployed `/api/inngest` endpoint. The handler uses the SDK's signature verification in cloud mode. For development, set `INNGEST_DEV=1` and run the CLI above. Never expose an unsigned development worker endpoint as production.

Functions include:

- Every minute: drain pending generation jobs and due scheduled deliveries from PostgreSQL.
- Generation: claim a job, invoke the provider, validate output, persist drafts, and settle usage.
- Delivery: atomically claim one scheduled delivery key, check approval, pause state, connection, mode, and recorded publishing consent, then publish or simulate.
- Every five minutes: fetch a bounded set of recent post comments.
- Daily: refresh eligible Instagram credentials or flag reconnect required.
- Every ten minutes: mark interrupted work for recovery without blindly republishing it.

Inngest retries failed generation steps using its durable workflow retries. Provider failures remain visible in the app and can be retried individually. A plan is generated as one schema-validated batch; granular retry of individual AI items is not yet implemented. Image provider calls are not inherently idempotent and an interrupted request can cause provider-side cost even when no result is saved.

Publishing is deliberately conservative: a request that may have reached Instagram enters `RECONCILE`. It is never automatically resent. The backend `post.reconcile` action checks a persisted container's provider status; unresolved or missing-container cases require manual operator investigation. The UI displays attempts and the error, but a full reconciliation console is unfinished. Failed, non-ambiguous deliveries can be reviewed and scheduled again from the editor.

### Instagram setup and verification still required

The code targets **Instagram API with Instagram Login**, professional accounts, and **single-image publishing**. It includes state-bound authorization tied to the signed-in workspace manager, code exchange, long-lived token storage, token refresh, container creation, status checks, media publishing, polling comments, reviewed replies, disconnect, and a signed webhook receiver.

Set `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, `INSTAGRAM_API_VERSION`, and `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`. Generate a base64 32-byte `TOKEN_ENCRYPTION_KEY` using the command in `.env.example`; tokens use Node's authenticated AES-256-GCM implementation. Keep a secure backup of the key. Key rotation tooling is not implemented.

Configure the exact OAuth redirect URL:

```text
https://YOUR_APP_ORIGIN/api/social/callback
```

Configure and subscribe the webhook URL:

```text
https://YOUR_APP_ORIGIN/api/social/webhook
```

The webhook validates `X-Hub-Signature-256`, deduplicates event payloads and provider comment IDs, and persists comments transactionally. Historical payload IDs are retained for replay deduplication. Add provider app subscriptions and verify production event shapes using a permitted test account.

Requested scopes are `instagram_business_basic`, `instagram_business_content_publish`, and `instagram_business_manage_comments`. These need current Meta developer configuration, the correct professional account type, test-user roles in development, and the applicable App Review / Advanced Access and business verification requirements for external users. Account capability flags represent implemented operations for this login path; granular permission introspection is still required before production use.

**No live Instagram round trip was verified.** Meta documentation requests in this session returned throttling/access errors. The default API version and scope/capability assumptions must be rechecked against your app dashboard and current official documentation before launch. Do not describe the connector as production certified. Instagram Login's documented flow is used; do not bolt PKCE onto it unless the current provider documentation supports it. Never ask for a social password.

Official references to verify:

- [Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login)
- [Content publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing)
- [Comment moderation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/comment-moderation)
- [Better Auth Prisma adapter](https://better-auth.com/docs/adapters/prisma)
- [Inngest Next.js integration](https://www.inngest.com/docs/getting-started/nextjs-quick-start)

The additional platform cards are labelled **Not implemented**. They do not simulate successful connections. Live missing credentials never fall back to demo success.

## Implemented workflows

- Registration, session-based protection, six saved onboarding steps, multiple workspaces and brands, membership roles.
- Verified brand knowledge, expiry dates, editable brand details, saved asset and content preferences.
- Database-backed plan outbox, generated editable drafts, optimistic revision checking, revision history, separate approval and delivery state machines.
- Owner/admin approval for a specific revision. Editing resets approval and cancels that delivery schedule. Tenant checks also apply to selected brand media and accounts.
- Month/week/list calendar, account and delivery filters, persisted rescheduling via the editor, cancellation, UTC storage and explicit IANA timezone conversion. Ambiguous/nonexistent daylight-saving times are rejected.
- Uploads, private media reads, generated backgrounds, basic PNG templates, and confirmation before unused-media deletion.
- Durable scheduled delivery with unique keys, atomic claiming, attempt history, pause controls, separate publishing consent, failure visibility, and conservative ambiguity handling.
- Inbox drafts, sensitive-comment escalation, manual editing, owner/admin approval, reply claiming, assignment, resolution, and ignore actions.
- Database-derived activity and usage pages. No fabricated reach, revenue, follower, or conversion metrics. No billing implementation.

## Remaining work before production acceptance

This is a substantive MVP, not a complete implementation of the 20-section brief. In addition to provider verification above:

- Planner needs explicit account/date-range selection, proposed posting slots, category mix controls, item-level retries, and a larger-history repetition policy. Saved weekly preferences are not a recurring auto-generation engine yet.
- Website importing is disabled. Products/prices can be stored as verified knowledge; a dedicated structured product/service editor is unfinished.
- The editor is Instagram-only. Shared cross-platform variants, drag-and-drop rescheduling, other rewrite controls, image placement, and editable template layouts need implementation.
- Auto-reply rules are deliberately unavailable; reviewed replies work. There is no automatic outbound engagement on other accounts' posts.
- Platform insights and metric freshness ingestion, full date/brand/account analytics filtering, provider publication-ID recovery, and webhook subscription management need completion.
- The current snapshot fetch is bounded to 300 posts, 100 comments, 50 jobs, and 15 activity events. Overview counters use full database aggregates; detailed lists and current analytics are bounded and need pagination before large workspaces. Comment polling fetches only the first page for 30 recent posts; extend cursor pagination for scale.
- Add a reply reconciliation console, transactional outbox for storage cleanup, upload orphan cleanup, broader provider rate-limit classification, and end-to-end retry/chaos testing. Current deletion refuses used media, but concurrent attachment/deletion needs a dedicated lifecycle lock before multi-writer production use.
- Add verified email, invitation management, self-service export/deletion, consent history for finer automatic action categories, request-body streaming limits at the reverse proxy, centralized observability, and a reviewed retention policy.
- Legal pages are visibly marked drafts and require the owner’s review. No payment processing or subscription plan is implied.

## Tests and verification

```powershell
npm run typecheck
npm test
npm run build
# With the local demo server on 4173:
$env:SMOKE_URL = 'http://localhost:4173'
node scripts/http-smoke.mjs
node scripts/browser-qa.mjs
```

Unit tests cover role permissions, cross-tenant ownership checks, approval revisions, pause and consent enforcement, expired knowledge, sensitive-comment escalation, UTC conversion and DST boundaries. Database integration tests apply the exact shipped SQL to an isolated PGlite instance and exercise Prisma foreign keys, duplicate job claiming, unapproved and paused delivery blocking, superseded keys, and comment/reply uniqueness. This verifies PostgreSQL-compatible behavior locally, not a real Neon deployment or all PostgreSQL concurrency semantics.

HTTP smoke tests create fresh isolated test users and workspaces and verify real Better Auth sessions, tenant denial, knowledge persistence, demo connection, explicit consent, approval requirements, UTC persistence, revision invalidation, stale-edit rejection, viewer restrictions, secret exclusion, and generation outbox creation. They never call a real publishing endpoint. The local evaluation database preserves these labelled test records.

Browser QA uses the installed Chrome channel through Playwright. It exercises six-step onboarding, draft creation, approval, consent, scheduling, calendar navigation, and mobile overflow/navigation checks. Screenshots are attempted in `screenshots/`; this environment may reject browser screenshot capture even when interactions work. See `VERIFICATION.md` for the actual final results.

## Seed safely

Optional, demo only: register a user first, configure the database in `.env`, then set `SEED_USER_EMAIL` to that registered email and run `npm run db:seed`. The seed adds a labelled fictional Olive & Oak workspace once for that user and never truncates or deletes existing records. No hardcoded login credentials are shipped.

## Deployment

Deploy this Node runtime application to Vercel or another Next.js-compatible Node host. Provision Neon, private object storage, Inngest, and provider secrets through that host's encrypted environment management. Apply migrations as a release step, then build and deploy. Keep worker durations sufficient for provider calls, configure reverse-proxy upload limits, and verify callback origins and HTTPS cookies. Use durable cloud Inngest for production, not the development harness.

This source was **not deployed or published**. The Sites hosting workflow was assessed, but its Worker/Vinext starter differs from the explicitly requested Next.js/Prisma Node stack. No stack substitution was made. Keep `.env`, local test databases, `.next`, and `node_modules` out of source archives and repositories. The lockfile fixes the tested dependency resolution, including an OpenTelemetry peer compatibility override.

## Meta Unified Login deployment

The current Meta app uses Unified Login. Set these server variables in Vercel:

- `INSTAGRAM_CLIENT_ID=999560325841779` (Meta App ID)
- `INSTAGRAM_CONFIG_ID=1527568975877411`
- `INSTAGRAM_CLIENT_SECRET` (Meta App Secret; never commit it)
- `INSTAGRAM_API_VERSION=v26.0`
- `APP_URL=https://socialpilot-amber.vercel.app`
- `BETTER_AUTH_URL=https://socialpilot-amber.vercel.app`
- `BETTER_AUTH_SECRET` and `TOKEN_ENCRYPTION_KEY` (stable server secrets)

Register `https://socialpilot-amber.vercel.app/api/social/callback` in Meta.
The app creates OAuth state internally; do not use the template's literal `<STATE>`.
Unified Login exchanges codes on graph.facebook.com and discovers profiles via
`me/assigned_instagram_accounts`. Share one Instagram account per connection;
multiple accounts are rejected rather than choosing an account implicitly.
Non-expiring tokens are stored with no expiry. Revoked credentials require reconnecting.
Existing legacy Instagram Login deployments can leave `INSTAGRAM_CONFIG_ID` unset.

Use `APP_MODE=live` with a separate live database and a live workspace. An existing
demo workspace cannot be used by merely changing APP_MODE; the API rejects that mismatch.
Apply migrations to the live database before using it. Redeploy after updating Vercel
variables and code, sign in, create the live workspace, and use Social Accounts.
Connecting an account does not grant publishing authorization.

Local mocked provider tests cover URL parameters, code exchange, account discovery,
and invalid selections. Real Meta authorization and deployment still require validation.

## LinkedIn: personal profiles and company pages

Create an app at https://www.linkedin.com/developers/apps and associate it with
an authorized LinkedIn company page. Request these products as appropriate:

- Sign In with LinkedIn using OpenID Connect (`openid`, `profile`).
- Share on LinkedIn (`w_member_social`) for personal-profile publishing.
- Community Management API access for company pages (`w_organization_social`,
  `r_organization_admin`). Company access is subject to LinkedIn approval.

Register this exact authorized redirect URL in the LinkedIn app's Auth tab:
`https://socialpilot-amber.vercel.app/api/social/linkedin/callback`.
For another deployment, use its APP_URL plus `/api/social/linkedin/callback`.

Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_API_VERSION=202610
on Vercel and redeploy. Keep TOKEN_ENCRYPTION_KEY stable. In a live workspace,
create/select a brand, then open Social Accounts. Connect a personal profile or
enter a numeric company page ID from its LinkedIn admin URL and connect the page.
Company access is checked against approved administrator roles returned by LinkedIn;
arbitrary organization IDs cannot be attached without administrator permission.
Each connection grants no publishing consent until explicitly authorized in the app.

The integration supports approved scheduled text or single-image posts using the
Posts and Images APIs. Tokens are encrypted at rest, have provider expiry, and
require reconnection when expired; automatic LinkedIn refresh and LinkedIn comment,
DM, and analytics ingestion are not implemented. Instagram refresh/comment jobs
exclude LinkedIn accounts. Ambiguous publishing results require manual inspection
on LinkedIn before retrying, to prevent duplicate posts. Keep the durable worker
running for scheduled deliveries. No live LinkedIn authorization or post has been
verified until real developer credentials and approved products are configured.

Official references:
- https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api
