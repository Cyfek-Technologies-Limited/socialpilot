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

Live TikTok/Instagram/LinkedIn competitor feeds, arbitrary third-party video transcripts, automatic engagement analytics, DM handling, cross-platform video/carousel publishing, voiceover production and automatic revenue attribution are **not implemented by this change**. They require additional supported providers, permissions, and implementation. YouTube caption downloads require permission to edit the source video; an API key alone does not unlock arbitrary third-party transcripts. LinkedIn analytics requires additional approved permissions beyond the personal-posting scopes currently connected. No live YouTube requests, emails or social publications were made during development.

The original video was left unchanged. Analysis artifacts live in the ignored work/strategy-reference folder.
