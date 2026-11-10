import { describe, expect, it } from 'vitest';
import { autopilotSlots, readAutopilot, autopilotMissingSetup, type AutopilotConfig } from '../src/lib/autopilot-config';
const config:AutopilotConfig={enabled:true,accountId:'account',days:[1,3,5],time:'09:00',timezone:'Africa/Lagos',authorizedBy:'owner',enabledAt:'2026-11-09T00:00:00Z'};
describe('autopilot schedules',()=>{
 it('uses 9 AM Lagos time on Monday, Wednesday and Friday',()=>{expect(autopilotSlots(config,new Date('2026-11-08T18:00:00Z'))[0].toISOString()).toBe('2026-11-09T08:00:00.000Z');expect(autopilotSlots(config,new Date('2026-11-10T18:00:00Z'))[0].toISOString()).toBe('2026-11-11T08:00:00.000Z');expect(autopilotSlots(config,new Date('2026-11-12T18:00:00Z'))[0].toISOString()).toBe('2026-11-13T08:00:00.000Z');});
 it('does not backfill missed or imminent slots',()=>{expect(autopilotSlots(config,new Date('2026-11-09T08:01:00Z'),24)).toEqual([]);expect(autopilotSlots(config,new Date('2026-11-09T07:55:00Z'),24)).toEqual([]);});
 it('never treats missing or malformed preferences as authorization',()=>{expect(readAutopilot({})).toBe(null);expect(readAutopilot({autopilot:{enabled:true}})).toBe(null);});
 it('requires durable production worker credentials in production',()=>{const missing=autopilotMissingSetup({NODE_ENV:'production',INNGEST_DEV:'1'});expect(missing).toContain('INNGEST_EVENT_KEY');expect(missing).toContain('INNGEST_SIGNING_KEY');});
});
