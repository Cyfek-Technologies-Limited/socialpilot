# Soville social team workflow

The supplied 83-second reference video was analyzed locally using visual samples and a timestamped speech transcript. Its modules are research (00:15–00:32), content (00:32–00:49), posting/community (00:49–01:03), and reporting (01:03–01:20). It explicitly says nothing goes public until approval. The user requested a month instead of the video's week.

## Using the implemented workflow

1. Open **Research & Strategy** for a brand. Enter a niche and optional YouTube channel URLs, @handles or UC-prefixed IDs. Live discovery searches a 30-day window and retrieves video statistics and public comments from up to six sampled videos. Results are a bounded sample, not a global trend feed. Competitor comparisons use the median lifetime view count among at least five observed channel videos and are labeled; they do not prove virality or explain causation.
2. Add manual evidence for other platforms or unavailable transcripts: source URL, creator, title, verified first-three-second dialogue, and comments. Saved evidence can be analyzed without a YouTube key. Findings retain source references. Titles are never labeled as spoken hooks; performance explanations are hypotheses.
3. Generate a monthly plan from the calendar. New plans request complete captions and a mix of video, carousel and caption production packs. Saved research and brand inspiration guide original content. Generation runs in resumable batches and does not publish or approve the result.
4. Open a draft in Content Studio. Edit captions, scenes, narration, shot directions and slides. Download branded carousel PNGs, a silent vertical text-video WebM, or the JSON production pack. Old drafts can request production packs. The browser renders video in real time; keep it open until export completes. Text-video export does not create voiceover, avatars, filmed footage or synchronized audio. WebM conversion may be needed on some destinations.
5. Review and schedule supported captions/single-image posts using existing controls. Existing explicitly authorized LinkedIn Autopilot remains separate and now receives saved research context. Research grants no additional publishing consent. Potential purchase-intent comments appear in the inbox Leads filter using a keyword heuristic, not a verified lead score.
6. Open Analytics for the team report. Delivery counts come from the database. Enter platform measurements for published posts to include impressions, reactions, comments, shares, clicks, attributed followers, customers and revenue. Measurements replace earlier entries for that post. Revenue is grouped by currency; missing metrics remain unavailable. Attribution is manual, not an implemented click/purchase tracking system.
7. Opt into daily research and reports. Inngest queues work at 05:00 UTC (06:00 Africa/Lagos), with tenant-specific deduplication, quota reservations and pause checks. Email reports are optional and require Resend; the recipient is the workspace member who enables delivery. In-app reports work without email.

## YouTube setup

1. In https://console.cloud.google.com/ create or select a project.
2. Open APIs & Services → Library; enable **YouTube Data API v3**.
3. Open APIs & Services → Credentials → Create credentials → API key. Restrict API access to YouTube Data API v3. This key is server-side; do not expose it as a NEXT_PUBLIC variable or use browser-referrer restrictions for server requests.
4. In Vercel Production add **YOUTUBE_API_KEY**, then redeploy and verify Inngest sync includes **strategy-planner**. No database migration is needed.
5. Review your quota before daily research for many brands. Each run performs one niche search, up to three competitor searches, one batched statistics request and up to six comment requests.

Official references:
- https://developers.google.com/youtube/data/guides/authentication
- https://developers.google.com/youtube/v3/docs/search/list
- https://developers.google.com/youtube/v3/docs/videos/list
- https://developers.google.com/youtube/v3/docs/commentThreads/list
- https://developers.google.com/youtube/v3/docs/captions/download

## Remaining integrations and limits

TikTok and LinkedIn public-post discovery now have Apify adapters, and X has a recent-search adapter, requiring their configured credentials. Instagram competitor feeds, arbitrary third-party video transcripts, automatic engagement analytics, DM handling, cross-platform video/carousel publishing, voiceover production and automatic revenue attribution remain **not implemented**. They require additional supported providers, permissions, and implementation. YouTube caption downloads require permission to edit the source video; an API key alone does not unlock arbitrary third-party transcripts. LinkedIn analytics requires additional approved permissions beyond the personal-posting scopes currently connected. No live YouTube requests, emails or social publications were made during development.

The original video was left unchanged. Analysis artifacts live in the ignored work/strategy-reference folder.

## Multiple research and calendar platforms

Select YouTube, TikTok, LinkedIn and/or X in Research & Strategy. Every provider receives the same saved niche query. Results preserve source text, URLs and available views/engagement. Findings compare performance within bounded platform samples; counts alone do not prove causation or global virality. TikTok uses a past-month, most-liked video search. LinkedIn uses a past-month public-post keyword search. X uses its seven-day recent-search endpoint. Missing provider access is shown explicitly.

New calendars require research and pin its snapshot to the generation request. Choose one or several target platforms: the post count is the total distributed across the selected platforms. YouTube/TikTok items require a topic, first-three-second hook, narration and shot list. LinkedIn gets developed text posts; X gets short posts validated with twitter-text against the standard weighted 280-character limit, including hashtags and links. Drafts keep their evidence links even if research is refreshed later. Publishing support is separate from research/drafting access.

Calendar → Clear all requires an owner/admin confirmation. It clears generated unpublished plan posts across all months for the selected brand and cancels pending/running plan jobs, preventing cleared jobs from recreating content. Published posts, posts with delivery attempts, processing/reconciliation records, manual posts and Autopilot posts are retained. Regeneration opens the normal research-backed planning form.

### Apify setup for TikTok and LinkedIn

1. Create an account at https://console.apify.com/.
2. Open Settings → API & Integrations and create a personal token for Soville. Keep it private.
3. Enable access to clockworks/tiktok-scraper and yugenox/linkedin-post-search in your account; accept any required actor pricing/permissions and provide credits if required. No LinkedIn cookies or personal login are passed by this integration.
4. Add APIFY_API_TOKEN to Vercel Production, then redeploy.
5. Select TikTok/LinkedIn in Research & Strategy and save. Each provider run requests 12 results and sets a maximum total charge of USD 0.50; actual provider pricing and available quota apply. Set an account-level budget before enabling daily research at scale. Provider run IDs are saved so retries resume existing runs instead of intentionally starting duplicates. An unconfirmed start requires checking the provider run before making a fresh request.

Sources: https://docs.apify.com/integrations/api ; https://apify.com/clockworks/tiktok-scraper ; https://apify.com/yugenox/linkedin-post-search ; https://docs.apify.com/api/v2/actors-runs-post

### X setup

Create an app in https://console.x.com/ (or the developer console linked by https://docs.x.com/), enable the access/credits needed for recent post search, and obtain its bearer token. Store it as X_BEARER_TOKEN in Vercel Production. Redeploy, select X in Research & Strategy, and save. Read access for search is separate from permission to publish. Official endpoint: https://docs.x.com/x-api/posts/search-recent-posts
