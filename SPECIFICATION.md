Copy this into **v0 AI Builder**. I’ve used **SocialPilot AI** as a temporary name you can replace.

Build a full-stack social media automation SaaS called “SocialPilot AI” using Next.js, TypeScript, Prisma ORM, and Neon PostgreSQL.

The application helps businesses and creators connect social accounts, describe their brand and goals, generate content and graphics, schedule posts, and manage comment replies.

Build a working application with persistent data and functional workflows. Do not stop at a landing page or dashboard mockup.

## 1. Technology and architecture

Use:

- Next.js App Router with TypeScript.
- Tailwind CSS and shadcn/ui.
- Lucide icons.
- Prisma ORM.
- Neon PostgreSQL for application data.
- A maintained authentication library compatible with this stack, using its documented Prisma integration.
- Zod for server-side input validation.
- React Hook Form for complex forms.
- Object storage for uploaded and generated media.
- A durable background job service for generation, scheduling, publishing, and retries.
- Provider abstractions for AI text generation, image generation, storage, and social integrations.

Use stable, mutually compatible dependency versions. Follow the installed versions’ documented configuration rather than mixing examples from different versions.

Use Server Components where appropriate, Client Components for interactive interfaces, and Route Handlers or Server Actions for server operations.

Keep database access, credentials, AI calls, and social API calls on the server.

Do not use localStorage as the application database.

## 2. Product concept

A user should be able to:

1. Create an account.
2. Create a workspace.
3. Set up one or more brands.
4. Describe each brand’s niche, target audience, goals, and tone.
5. Upload logos, product photos, and brand assets.
6. Add verified business information and FAQs.
7. Connect supported social accounts.
8. Choose content preferences and posting frequency.
9. Generate a weekly content calendar.
10. Review and edit captions and graphics.
11. Approve and schedule content.
12. Publish through supported integrations.
13. Review incoming comments and suggested replies.
14. Enable limited automatic replies under explicit rules.
15. Track actual publishing activity and available performance metrics.

Workspaces must support multiple brands and members. Keep the initial user experience simple for a single business owner.

## 3. Design direction

Create a polished SaaS interface with:

- Light background, dark slate text, and indigo accents.
- Clean typography and generous spacing.
- Subtle borders, rounded cards, and restrained shadows.
- A persistent desktop sidebar.
- A responsive mobile navigation drawer.
- Clear status badges.
- Accessible forms and dialogs.
- Loading skeletons, useful empty states, and actionable errors.

Sidebar:

- Overview
- Brands
- Social Accounts
- Content Calendar
- Content Studio
- Media Library
- Engagement Inbox
- Analytics
- Automation
- Usage
- Settings

Include a workspace switcher and brand selector.

Use realistic sample content in an explicitly labelled demo environment. Never present demo metrics or simulated publishing as real account activity.

## 4. Public pages and authentication

Build:

- Landing page explaining content generation, scheduling, graphics, and comment management.
- Sign-up page.
- Sign-in page.
- Password recovery flow if supported by the selected authentication method.
- Privacy policy and terms pages with clearly marked draft copy requiring owner review.
- Protected application routes.

The landing page should have a strong hero, product preview, how-it-works section, feature sections, and a clear sign-up CTA.

After registration, take the user through onboarding.

Persist authentication sessions securely. Do not implement custom cryptography or store plaintext passwords.

## 5. Onboarding wizard

Create a multi-step wizard that saves progress to the database.

### Step 1: Workspace

Collect:

- Workspace name.
- User’s display name.
- Preferred timezone.
- Preferred language.

Default the timezone from the browser when possible and allow editing.

### Step 2: Brand profile

Collect:

- Brand name.
- Business description.
- Niche or industry.
- Website URL.
- Target audience.
- Audience location.
- Preferred language.
- Tone of voice.
- Primary goal: awareness, engagement, enquiries, sales, or community growth.
- Main call to action.

### Step 3: Business knowledge

Collect:

- Products and services.
- Approved descriptions and prices.
- Currency.
- Delivery or service locations.
- Business hours.
- Contact information.
- FAQs and approved answers.
- Offers and their expiry dates.
- Prohibited topics and unsupported claims.

Allow users to edit this information later.

Treat these records as the source of truth for business-specific content and replies. Do not invent facts when information is missing.

### Step 4: Brand assets

Allow:

- Logo upload.
- Product photo uploads.
- Brand colour selection.
- Font preferences.
- Sample captions.
- Visual style preferences.

### Step 5: Social accounts

Display available platform integrations and their actual capability status.

If an integration is not configured, show “Setup required” with a useful explanation.

### Step 6: Content and automation preferences

Collect:

- Posts per day or week.
- Posting days.
- Preferred local posting times.
- Content categories.
- Desired mix of educational, promotional, community, and informational posts.
- Caption length.
- Emoji and hashtag preferences.
- Review-before-publishing or automatic publishing preference.

Automatic publishing must only be available for integrations that support it and after explicit user authorization.

Default comment replies to review mode.

## 6. Overview dashboard

Show real database-backed summaries:

- Connected accounts.
- Drafts awaiting review.
- Scheduled posts.
- Published posts.
- Failed publishing attempts.
- Comments awaiting attention.
- Usage for the current period.

Include:

- Upcoming posts.
- Recent activity.
- Account connection warnings.
- Quick actions for generating a plan, creating a post, and opening the inbox.

Display unavailable metrics honestly.

## 7. Content planning

Create a content planner where users choose:

- Brand.
- Connected accounts.
- Date range.
- Posting frequency.
- Campaign objective.
- Optional campaign instructions.
- Topics and content categories.

Generate a structured content plan containing:

- Topic.
- Content category.
- Intended audience.
- Objective.
- Caption draft.
- Call to action.
- Graphic brief.
- Target platform.
- Proposed local publishing time.

Use the brand profile, verified business facts, active offers, and recent content history.

Avoid repetitive posts and expired promotions.

Validate AI output with a schema before saving it. Show generation progress and allow retrying failed items without regenerating successful ones.

Generate drafts first. Scheduling and publication must follow the user’s approval and automation settings.

## 8. Content Studio

Build a functional post editor with:

- Brand and platform selection.
- Caption editor.
- Hashtag editor.
- Media selection.
- Graphic generation.
- Platform preview.
- Date and time picker.
- Approval status.
- Save draft, submit for review, approve, and schedule actions.

Support platform-specific versions of a shared content idea.

Allow AI actions such as:

- Shorten.
- Expand.
- Change tone.
- Rewrite the call to action.
- Generate alternatives.

Preserve user edits and keep revision history. Regeneration must not silently overwrite approved content.

Editing approved content should invalidate the approval for that version.

Use distinct content approval and delivery states rather than one ambiguous status field.

## 9. Graphics and media

Implement two graphic workflows.

### Branded templates

Provide configurable templates for:

- Educational tips.
- Product spotlights.
- Announcements.
- Offers.
- FAQ posts.
- Testimonials using user-provided testimonial text.

Allow editing text, colours, image placement, and logo placement.

Render precise text and logos through templates, SVG, or a suitable rendering library. Export a usable image file.

### AI-generated images

Use a server-side image provider interface to generate suitable illustrations or backgrounds.

Use actual uploaded photos for product depictions when accuracy matters.

Store media files in object storage and keep metadata in PostgreSQL.

Media metadata should include:

- Workspace and brand.
- File name.
- MIME type.
- File size.
- Dimensions.
- Storage key.
- Source: uploaded, generated, or rendered.
- Generation prompt where applicable.

Validate upload type and size. Support removing unused assets with a confirmation dialog.

When external publishing requires fetchable media, use an appropriate delivery URL with sufficient validity. Do not expose private assets unnecessarily.

## 10. Content calendar

Build month, week, and list views.

Support:

- Filtering by brand, account, platform, and status.
- Opening a post for editing.
- Rescheduling.
- Cancelling scheduled delivery.
- Displaying timezone clearly.
- Status colours with accessible text labels.

Store timestamps in UTC and retain the relevant IANA timezone for recurring schedules.

Handle daylight-saving changes where applicable.

Dragging or changing a date must persist the change.

## 11. Social integrations

Create a shared integration interface with methods such as:

- Start authorization.
- Complete authorization.
- Retrieve connected account details.
- Validate connection.
- Refresh credentials where supported.
- Retrieve capabilities.
- Publish supported content.
- Retrieve publication status.
- Receive or retrieve comments.
- Reply to a comment where supported.
- Retrieve available metrics.
- Disconnect.

Model capabilities per connected account. Do not assume every platform, account type, or permission supports the same features.

Implement one integration end to end before pretending to support every platform.

Prioritize Instagram professional accounts as the first integration target, subject to current official API requirements.

Create clearly labelled integration scaffolding for additional platforms.

Use official APIs and authorization flows. Never request a user’s social password or automate platform websites to bypass API restrictions.

Use state validation, PKCE where applicable, least-privilege permissions, encrypted token storage, and safe redirect handling.

Account connection and authorization to perform automatic actions must be recorded separately where required.

Do not claim a connection succeeded until the provider confirms it.

Consult current official platform documentation before implementing publishing or engagement features. Document required developer setup, permissions, app review, and account restrictions.

## 12. Scheduling and background execution

Use a durable queue or workflow service compatible with the deployment environment.

Do not rely on browser timers, in-memory jobs, or a long-running Next.js request.

Support:

- Content generation jobs.
- Image generation jobs.
- Scheduled publishing.
- Media processing checks.
- Retry with exponential backoff.
- Rate-limit handling.
- Failed-job visibility.
- Job cancellation.
- Publishing reconciliation.

Persist delivery attempts and provider post IDs.

Use a unique delivery key and atomic job claiming to prevent duplicate execution.

If a provider times out after a request may have succeeded, reconcile the provider status before blindly retrying.

Recheck approval, authorization, connection status, and pause settings immediately before publication.

Never mark a post published until the provider confirms success.

Provide a global pause control and per-brand pause controls.

## 13. Engagement inbox

Create an inbox showing:

- Platform and connected account.
- Original post.
- Comment author.
- Comment text.
- Timestamp.
- Suggested response.
- Processing status.

Actions:

- Generate reply.
- Edit reply.
- Approve and send.
- Assign to a member.
- Mark resolved.
- Escalate to the owner.
- Ignore.

Suggested replies must use verified brand information and the original post context.

If the system cannot answer reliably, ask for human attention.

Treat external comments as untrusted data, never as system instructions.

Deduplicate incoming events. Prevent replying repeatedly to the same comment.

Automatic replies should be disabled by default and enabled only for supported integrations and explicitly permitted categories.

Allow configurable limits and rules.

Escalate complaints, refunds, sensitive information, disputes, and requests involving unsupported commitments.

Do not build indiscriminate automatic commenting on other people’s posts. Provide a manual engagement drafting area instead, using user-supplied content or permitted API data.

## 14. Analytics

Show actual available metrics, such as:

- Publishing success rate.
- Posts published.
- Comment volume.
- Replies sent.
- Engagement metrics provided by the connected platform.
- Performance by post and content category.

Include date, brand, and account filters.

Show metric freshness and explain unavailable data.

Do not invent reach, follower growth, conversions, or revenue attribution.

## 15. Data model

Design a relational Prisma schema including:

- User and authentication models required by the chosen auth library.
- Workspace.
- WorkspaceMember with owner, admin, editor, and viewer roles.
- Brand.
- BrandKnowledgeEntry.
- ProductOrService.
- BrandAsset.
- SocialAccount.
- AutomationSettings.
- ContentPlan.
- ContentItem.
- PlatformPost.
- PostRevision.
- Approval.
- PublishAttempt.
- BackgroundJob or a durable reference to external jobs.
- Comment.
- Reply.
- Notification.
- UsageEvent.
- AuditLog.

Use foreign keys, appropriate indexes, uniqueness constraints, timestamps, and deliberate deletion behaviour.

Include workspace ownership on tenant-scoped records.

Store social secrets encrypted and exclude them from client responses and logs.

Use PostgreSQL for user information and application records; use object storage for binary media.

Create actual Prisma migrations. Include a safe development seed script that does not erase existing data.

Follow the installed Prisma version’s Neon connection and migration configuration.

## 16. Authorization and security

Enforce workspace membership and role permissions on every server operation.

Never trust a workspace ID from the client without checking access.

Validate ownership of nested resources, including brands, posts, media, and social accounts.

Protect webhook endpoints with provider signature verification and replay protections where supported.

Implement:

- Input validation.
- Rate limits on expensive operations.
- Safe secret handling.
- Redacted logs.
- Upload validation.
- Sanitized rendered content.
- Account disconnection.
- Consent records.
- Audit records for approvals, publishing, and automation changes.

Do not fetch arbitrary user-provided URLs without SSRF protections. Website importing is optional and should remain disabled unless implemented safely.

## 17. Usage controls

Track:

- Text generations.
- Image generations.
- Scheduled and published posts.
- Reply generations.
- Connected accounts.
- Storage usage.

Enforce configurable workspace limits on the server.

Reserve usage before expensive jobs and settle or release reservations based on the result.

Build a usage page, but do not pretend real billing exists if no payment integration has been implemented.

## 18. Demo and live modes

Provide an explicit demo mode for evaluating the app without external credentials.

Demo mode must:

- Display a persistent “Demo mode” indicator.
- Use clearly labelled sample data.
- Simulate publishing only inside the demo environment.
- Never call real publishing endpoints.
- Never mix simulated events with live account metrics.

In live mode, missing credentials should produce an actionable setup state. Do not silently fall back to fake success.

## 19. Environment and documentation

Provide an `.env.example` containing placeholders only.

Document the variables required for:

- Neon and Prisma.
- Authentication.
- Encryption.
- AI providers.
- Object storage.
- Background jobs.
- Social OAuth.
- Webhook verification.
- Application URL.

Provide a README covering:

- Local setup.
- Dependency installation.
- Database migrations.
- Seeding.
- Running the application.
- Running background processing.
- Configuring storage and AI.
- Setting social callback URLs.
- Required platform approvals.
- Deployment.
- Working features versus unfinished integrations.

Fail clearly when essential configuration is missing.

## 20. Implementation order and acceptance criteria

Implement in this order:

1. Authentication, database, workspaces, and tenant authorization.
2. Brand onboarding and knowledge management.
3. Content plans, drafts, editor, and calendar.
4. Graphics and media storage.
5. Background execution and scheduling.
6. First real social integration.
7. Engagement inbox and reply approval.
8. Actual analytics and usage controls.

Complete useful vertical workflows before adding more superficial screens.

Verify that:

- A new user can register and finish onboarding.
- Brand information persists across sessions.
- One workspace cannot access another workspace’s data.
- Generated content becomes editable database-backed drafts.
- Calendar changes persist.
- Unapproved content cannot be published.
- Expired offers are not used automatically.
- Pausing automation blocks queued deliveries.
- Duplicate jobs and webhook events do not create duplicate posts or replies.
- Failed publication is visible and recoverable.
- Missing credentials never produce fake success.
- Tokens and API keys never reach the browser.

Add meaningful tests for tenant isolation, authorization, approval enforcement, timezone scheduling, and duplicate-delivery prevention.

Deliver the implemented application, migrations, environment template, setup documentation, and an honest account of any external integration steps still required.