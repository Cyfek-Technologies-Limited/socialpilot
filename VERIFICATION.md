# Verification — 5 November 2026

## Passed

- `npm run typecheck`: no TypeScript errors.
- `npm run build`: Prisma Client generation and Next.js 16.4.5 optimized production build succeeded. All 15 route entries compiled, including server API routes and protected application routing.
- `npm test`: **19 tests passed** across policy and database integration suites.
- The exact shipped migration was applied to isolated PostgreSQL-compatible PGlite instances. Prisma tenant foreign-key constraints and uniqueness constraints were exercised.
- Duplicate delivery invocations produced one simulated provider result and one attempt. Stale delivery keys did not claim work. Unapproved drafts and paused queued deliveries were blocked.
- A generated plan persisted three editable drafts, and repeated processing of its job did not duplicate those drafts.
- Signed webhook tests accepted valid events, rejected modified payloads, and deduplicated repeated events.
- HTTP smoke checks passed for registration, session cookies, workspace and brand creation, cross-tenant denial, knowledge persistence, demo account connection, explicit publishing consent, approval enforcement, UTC schedule persistence, invalidation on edits, stale-version rejection, viewer restrictions, secret exclusion from responses, and generation outbox persistence.
- Browser checks passed for all six onboarding steps, verified knowledge entry, draft creation, owner approval, publishing authorization, scheduling, calendar navigation, and mobile navigation at 390×844. No horizontal overflow or browser page errors appeared in the passing run.
- Desktop workspace and calendar screenshots and a mobile workspace screenshot were captured and visually inspected. The workspace switcher layout and small interface typography were adjusted after inspection. Screenshots display labelled demo data.

## Limits of verification

- The attached Neon organization rejected project creation because it is managed by Vercel. No remote Neon project or migration was created. PostgreSQL concurrency and operational behavior must be tested against the real deployment database before launch; PGlite's single-connection test server is not a substitute for that.
- No application was deployed. A local evaluation server was used on port 4173 and stopped after testing.
- No live Instagram authorization, publication, reply, token refresh, App Review, or webhook delivery was tested with Meta. Attempts to retrieve the official documentation were throttled or inaccessible. The code and required configuration are supplied, with current API assumptions flagged for verification.
- AI provider calls, external object storage, password-reset email delivery, and Inngest Cloud were not exercised against paid/external services. Core generation and publication functions were invoked directly in local integration tests; the deployed durable worker still needs its service setup and acceptance test.
- Initial browser screenshot captures intermittently failed. Later captures succeeded. The included screenshots are actual browser captures; the interaction assertions were run independently of capture success.
- This is an MVP. The README explicitly lists remaining specification gaps, including planner date/account selection, template layout controls, other platforms, automatic reply rules, platform insights, and production lifecycle hardening.

## Deliverable hygiene

The source ZIP includes implementation, tests, package lock, SQL migration, safe seed, placeholder environment template, setup documentation, the original specification, and screenshots. It excludes dependencies, build output, credentials, and local evaluation data. No real social publication or external reply was sent.
