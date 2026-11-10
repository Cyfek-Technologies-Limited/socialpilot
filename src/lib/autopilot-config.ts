import { Temporal } from '@js-temporal/polyfill';
import { z } from 'zod';
export const autopilotSchema=z.object({enabled:z.boolean(),accountId:z.string().min(1),days:z.array(z.number().int().min(1).max(7)).min(1).max(7),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),timezone:z.string().min(1),authorizedBy:z.string().min(1),enabledAt:z.string()});
export type AutopilotConfig=z.infer<typeof autopilotSchema>;
export function readAutopilot(preferences:unknown){const input=preferences as {autopilot?:unknown}|null;const result=autopilotSchema.safeParse(input?.autopilot);return result.success?result.data:null;}
export function autopilotSlots(config:AutopilotConfig,now=new Date(),hours=36){
 const start=Temporal.Instant.fromEpochMilliseconds(now.getTime());const today=start.toZonedDateTimeISO(config.timezone).toPlainDate();const end=now.getTime()+hours*3600000;const slots:Date[]=[];
 for(let i=0;i<=Math.ceil(hours/24)+1;i++){const date=today.add({days:i});if(!config.days.includes(date.dayOfWeek))continue;const when=date.toPlainDateTime(Temporal.PlainTime.from(config.time)).toZonedDateTime(config.timezone,{disambiguation:'reject'}).epochMilliseconds;if(when>=now.getTime()+10*60000&&when<=end)slots.push(new Date(when));}return slots;
}
export function autopilotMissingSetup(env:NodeJS.ProcessEnv=process.env){const required=['OPENAI_API_KEY','OPENAI_TEXT_MODEL','S3_ENDPOINT','S3_REGION','S3_BUCKET','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','TOKEN_ENCRYPTION_KEY'];if(env.NODE_ENV==='production')required.push('INNGEST_EVENT_KEY','INNGEST_SIGNING_KEY');return required.filter(key=>!env[key]);}
