import { z } from 'zod';
import twitterText from 'twitter-text';
const { parseTweet }=twitterText;
export const contentPlatformSchema=z.enum(['youtube','tiktok','twitter','linkedin','instagram']);
export type ContentPlatform=z.infer<typeof contentPlatformSchema>;
export const platformLabels:Record<string,string>={youtube:'YouTube',tiktok:'TikTok',twitter:'X / Twitter',linkedin:'LinkedIn',instagram:'Instagram'};
export function textLength(platform:string,text:string){return platform==='twitter'?parseTweet(text).weightedLength:text.length;}
export function validatePlatformText(platform:string,caption:string,hashtags=''){
 if(platform==='twitter'&&!parseTweet([caption,hashtags].filter(Boolean).join('\n\n')).valid)throw new Error('X posts must fit the standard 280-character weighted limit, including hashtags and links.');
}
export const platformWritingRules='Follow desiredPlatforms in order for every item. YouTube and TikTok require production.format=video with a complete original spoken script in scene narration, a first-three-second hook, practical body and CTA. Include a specific content topic and a useful description/caption. LinkedIn requires production.format=caption and a developed 600-1600 character post with paragraphs and useful advice. X/Twitter requires production.format=caption and a concise standalone post of at most 280 weighted characters total including hashtags and links; aim for 180-240 to leave margin. Never turn an X post into a long LinkedIn-style caption. Instagram may use caption or carousel. Each item must explain its researched angle through sourceIds, using supplied evidence without copying it.';
