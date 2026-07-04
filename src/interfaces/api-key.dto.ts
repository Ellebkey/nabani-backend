// ===== API KEY DTOs =====

/**
 * Scopes bound what an API key may do. Keep this list as the single source of
 * truth — the CLI validates against it and the combined guard checks it.
 */
export type ApiKeyScope = 'drafts:write';

export const API_KEY_SCOPES: ApiKeyScope[] = ['drafts:write'];

export interface CreateApiKeyDto {
  userId: string;
  name: string;
  scopes: ApiKeyScope[];
  expiresAt?: Date | null;
}

export interface ApiKeyDto {
  id: number;
  userId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/**
 * Returned ONLY at creation/rotation: includes the plaintext `key`, which is
 * shown once and never retrievable again.
 */
export interface GeneratedApiKeyDto extends ApiKeyDto {
  key: string;
}
