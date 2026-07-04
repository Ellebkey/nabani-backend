import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env.test BEFORE any other module imports (via jest setupFiles)
// dotenv does NOT overwrite existing env vars, so these take precedence
config({ path: resolve(__dirname, '../../../.env.test'), quiet: true });
