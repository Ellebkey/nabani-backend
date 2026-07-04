/* eslint-disable no-console */
/**
 * API key management CLI.
 *
 * Usage (via npm, args after `--`):
 *   npm run apikey -- generate --user <uuid> --label "n8n automation" --scopes drafts:write [--expires 2026-12-31]
 *   npm run apikey -- list --user <uuid>
 *   npm run apikey -- revoke --id <keyId>
 *   npm run apikey -- rotate --id <keyId>
 *
 * The plaintext key is printed ONCE on generate/rotate and is never recoverable.
 */
import { SequelizeDB, db } from '@config/sequelize';

import ApiKeyService from '@services/api-key.service';

import { API_KEY_SCOPES, ApiKeyScope } from '@interfaces/api-key.dto';

interface CliOptions {
  user?: string;
  label?: string;
  scopes?: string;
  expires?: string;
  id?: string;
}

const USAGE = [
  'API key management CLI',
  '',
  'Commands:',
  '  generate --user <uuid> --label <name> --scopes <a,b> [--expires <YYYY-MM-DD>]',
  '  list     --user <uuid>',
  '  revoke   --id <keyId>',
  '  rotate   --id <keyId>',
  '',
  `Valid scopes: ${API_KEY_SCOPES.join(', ')}`,
].join('\n');

function parseOptions(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token && token.startsWith('--')) {
      const key = token.slice(2) as keyof CliOptions;
      const value = argv[i + 1];
      options[key] = value;
      i += 1;
    }
  }
  return options;
}

function parseScopes(raw: string | undefined): ApiKeyScope[] {
  if (!raw) throw new Error('At least one scope is required (--scopes)');
  const requested = raw.split(',').map((scope) => scope.trim()).filter(Boolean);
  if (requested.length === 0) throw new Error('At least one scope is required (--scopes)');

  const invalid = requested.filter((scope) => !API_KEY_SCOPES.includes(scope as ApiKeyScope));
  if (invalid.length > 0) {
    throw new Error(`Unknown scope(s): ${invalid.join(', ')}. Valid scopes: ${API_KEY_SCOPES.join(', ')}`);
  }
  return requested as ApiKeyScope[];
}

function parseExpiry(raw: string | undefined): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --expires date: ${raw} (use YYYY-MM-DD or an ISO date)`);
  }
  return date;
}

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) {
    throw new Error('A positive numeric --id is required');
  }
  return id;
}

async function runGenerate(options: CliOptions): Promise<void> {
  if (!options.user) throw new Error('--user <uuid> is required');
  if (!options.label) throw new Error('--label <name> is required');

  const scopes = parseScopes(options.scopes);
  const expiresAt = parseExpiry(options.expires);

  const result = await ApiKeyService.generate({
    userId: options.user,
    name: options.label,
    scopes,
    expiresAt,
  });

  console.log('\n✅ API key created. Copy it now — it will NOT be shown again:\n');
  console.log(`   ${result.key}\n`);
  console.log('Details:');
  console.log(`   id:        ${result.id}`);
  console.log(`   user_id:   ${result.userId}`);
  console.log(`   label:     ${result.name}`);
  console.log(`   prefix:    ${result.keyPrefix}`);
  console.log(`   scopes:    ${result.scopes.join(', ')}`);
  console.log(`   expires:   ${result.expiresAt ?? 'never'}`);
  console.log('\nSend it as the header  X-API-Key: <key>\n');
}

async function runList(options: CliOptions): Promise<void> {
  if (!options.user) throw new Error('--user <uuid> is required');
  const keys = await ApiKeyService.list(options.user);

  if (keys.length === 0) {
    console.log('No API keys for this user.');
    return;
  }

  console.log(`\nAPI keys for user ${options.user}:\n`);
  keys.forEach((key) => {
    const state = key.revokedAt ? `revoked ${key.revokedAt}` : 'active';
    const lastUsed = key.lastUsedAt ?? 'never';
    const expires = key.expiresAt ?? 'never';
    console.log(`  #${key.id}  ${key.keyPrefix}…  [${key.scopes.join(', ')}]  ${state}`);
    console.log(`       label="${key.name}"  lastUsed=${lastUsed}  expires=${expires}`);
  });
  console.log('');
}

async function runRevoke(options: CliOptions): Promise<void> {
  const id = parseId(options.id);
  const key = await ApiKeyService.revoke(id);
  console.log(`\n🔒 API key #${key.id} (${key.keyPrefix}…) revoked at ${key.revokedAt}\n`);
}

async function runRotate(options: CliOptions): Promise<void> {
  const id = parseId(options.id);
  const result = await ApiKeyService.rotate(id);

  console.log(`\n♻️  API key #${id} rotated. The old key is revoked. New key (shown once):\n`);
  console.log(`   ${result.key}\n`);
  console.log(`   new id:  ${result.id}`);
  console.log(`   scopes:  ${result.scopes.join(', ')}`);
  console.log(`   expires: ${result.expiresAt ?? 'never'}\n`);
}

const COMMANDS: Record<string, (options: CliOptions) => Promise<void>> = {
  generate: runGenerate,
  list: runList,
  revoke: runRevoke,
  rotate: runRotate,
};

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const handler = command ? COMMANDS[command] : undefined;

  if (!handler) {
    console.log(USAGE);
    process.exit(command ? 1 : 0);
    return;
  }

  await new SequelizeDB().initDataBase();
  if (!db.sequelize) {
    throw new Error('Database connection failed — check SQL_* env vars and that PostgreSQL is running');
  }

  try {
    await handler(parseOptions(rest));
  } finally {
    await db.sequelize.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(`\n❌ ${error instanceof Error ? error.message : JSON.stringify(error)}\n`);
    process.exit(1);
  });
