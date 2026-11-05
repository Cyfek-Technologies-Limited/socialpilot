import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({resolve:{alias:{'@':path.resolve('src'),'server-only':path.resolve('tests/server-only.ts')}},test:{testTimeout:30000,hookTimeout:60000,fileParallelism:false}});
