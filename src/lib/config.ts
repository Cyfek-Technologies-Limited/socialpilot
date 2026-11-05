export function required(name: string) { const value = process.env[name]; if (!value) throw new Error(`Setup required: configure ${name} on the server.`); return value; }
export function appMode() { const value=process.env.APP_MODE; if(value!=='demo'&&value!=='live') throw new Error('Setup required: set APP_MODE to demo or live.'); return value; }
export function appUrl() { return required('APP_URL'); }
