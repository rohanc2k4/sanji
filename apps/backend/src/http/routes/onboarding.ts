import { Hono } from 'hono';
import { z } from 'zod';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveVaultPaths } from '../../config/paths.js';
import { loadOrInitConfig, saveConfig } from '../../config/loader.js';
import { openDb } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { makeAdapter } from '../../llm/factory.js';
import { ConfigSchema } from '@sanji/shared';
import { dtoToConfig } from '../dto.js';
import type {
  ConfigDto,
  VaultValidateResult,
  ProviderTestResult,
} from '@sanji/shared';

const ValidateVaultBody = z.object({ vault: z.string().min(1) });

const TestProviderBody = z.object({
  provider: z.object({
    mode: z.enum(['claude-code', 'anthropic-api']),
    anthropicApiKey: z.string().optional(),
  }),
});

// Init body trusts the frontend's ConfigDto shape — the frontend constructed it
// from our own GET /api/config or onboarding flow, so deep validation here is
// overkill. dtoToConfig will throw on missing fields if the shape is broken.
const InitBody = z.object({
  vault: z.string().min(1),
  config: z.object({}).passthrough(),
});

function countMdFiles(dir: string): number {
  let count = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.')) continue;
        stack.push(full);
      } else if (entry.name.endsWith('.md')) {
        count += 1;
      }
    }
  }
  return count;
}

export function onboardingRoute() {
  const r = new Hono();

  r.post('/api/onboarding/validate-vault', async (c) => {
    const parsed = ValidateVaultBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { kind: 'api-error', code: 'BAD_BODY', message: parsed.error.message },
        400,
      );
    }
    const { vault } = parsed.data;
    let result: VaultValidateResult;
    try {
      const st = statSync(vault);
      if (!st.isDirectory()) {
        result = { ok: false, noteCount: 0, hasExisting: false, reason: 'not a directory' };
      } else {
        result = {
          ok: true,
          noteCount: countMdFiles(vault),
          hasExisting: existsSync(join(vault, '.sanji')),
        };
      }
    } catch (err) {
      result = {
        ok: false,
        noteCount: 0,
        hasExisting: false,
        reason: err instanceof Error ? err.message : 'stat failed',
      };
    }
    return c.json(result);
  });

  r.post('/api/onboarding/test-provider', async (c) => {
    const parsed = TestProviderBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { kind: 'api-error', code: 'BAD_BODY', message: parsed.error.message },
        400,
      );
    }
    // Build a defaults-filled internal Config with just the provider section
    // overridden, so we can hand it to makeAdapter.
    const cfg = ConfigSchema.parse({
      provider: {
        mode: parsed.data.provider.mode,
        anthropic_api: { api_key: parsed.data.provider.anthropicApiKey ?? '' },
      },
    });
    const adapter = makeAdapter(cfg);
    const result: ProviderTestResult = await adapter.testCredentials();
    return c.json(result);
  });

  r.post('/api/onboarding/init', async (c) => {
    const parsed = InitBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { kind: 'api-error', code: 'BAD_BODY', message: parsed.error.message },
        400,
      );
    }
    const paths = resolveVaultPaths(parsed.data.vault);
    const initial = loadOrInitConfig(paths); // creates .sanji/ + default config.toml
    const dto = parsed.data.config as unknown as ConfigDto;
    const merged = dtoToConfig(dto, initial);
    saveConfig(paths, merged); // overwrite with chosen config
    const db = openDb(paths.indexDb);
    try {
      runMigrations(db);
    } finally {
      db.close();
    }
    return c.json(dto);
  });

  return r;
}
