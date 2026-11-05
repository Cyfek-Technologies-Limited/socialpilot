// Optional local evaluation harness. Production remains Neon PostgreSQL.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFileSync,mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
const directory=resolve(process.env.LOCAL_DEMO_DIRECTORY||'../../work/socialpilot-demo-db');mkdirSync(directory,{recursive:true});
const db=await PGlite.create(directory);await db.exec('CREATE TABLE IF NOT EXISTS local_demo_migrations (name TEXT PRIMARY KEY)');
if(!(await db.query('SELECT name FROM local_demo_migrations WHERE name=$1',['initial'])).rows.length){await db.exec(readFileSync('prisma/migrations/202611050001_initial/migration.sql','utf8').replace(/^\uFEFF/,''));await db.query('INSERT INTO local_demo_migrations VALUES ($1)',['initial']);}
const server=new PGLiteSocketServer({db,host:'127.0.0.1',port:55440,maxConnections:1});await server.start();
const port=process.env.PORT||'3000';const env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:55440/postgres?sslmode=disable&connection_limit=1',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:55440/postgres?sslmode=disable&connection_limit=1',APP_MODE:'demo',APP_URL:`http://localhost:${port}`,BETTER_AUTH_URL:`http://localhost:${port}`,BETTER_AUTH_SECRET:randomBytes(48).toString('base64url'),INNGEST_DEV:'1',NEXT_TELEMETRY_DISABLED:'1'};
const next=spawn(process.execPath,['node_modules/next/dist/bin/next',process.argv.includes('--production')?'start':'dev','--hostname','127.0.0.1','--port',port],{env,stdio:'inherit'});
console.log(`Local demo: http://localhost:${port} (durable local test data; never live publishing).`);
const stop=async()=>{next.kill();await server.stop();await db.close();process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);next.on('exit',async()=>{await server.stop();await db.close();});
