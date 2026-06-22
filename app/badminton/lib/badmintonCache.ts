import type { Member, SystemConfiguration } from './types';

/** Stable badminton data — members & config change infrequently */
export const BADMINTON_SLOW_DATA_TTL_MS = 15 * 60 * 1000;

type CacheEntry<T> = { expiresAt: number; value: T };

function getStore() {
  const g = globalThis as unknown as {
    __badminton_domain_cache__?: Map<string, CacheEntry<unknown>>;
  };
  if (!g.__badminton_domain_cache__) {
    g.__badminton_domain_cache__ = new Map();
  }
  return g.__badminton_domain_cache__;
}

function cacheGet<T>(key: string): T | null {
  const hit = getStore().get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    getStore().delete(key);
    return null;
  }
  return hit.value as T;
}

function cacheSet<T>(key: string, value: T, ttlMs = BADMINTON_SLOW_DATA_TTL_MS) {
  getStore().set(key, { expiresAt: Date.now() + ttlMs, value });
}

function cacheDelete(key: string) {
  getStore().delete(key);
}

function membersKey(spreadsheetId: string) {
  return `members:${spreadsheetId}`;
}

function configKey(spreadsheetId: string) {
  return `config:${spreadsheetId}`;
}

export function getCachedMembers(spreadsheetId: string): Member[] | null {
  return cacheGet<Member[]>(membersKey(spreadsheetId));
}

export function setCachedMembers(spreadsheetId: string, members: Member[]) {
  cacheSet(membersKey(spreadsheetId), members);
}

export function invalidateMembersCache(spreadsheetId: string) {
  cacheDelete(membersKey(spreadsheetId));
}

export function getCachedConfiguration(
  spreadsheetId: string
): SystemConfiguration | null {
  return cacheGet<SystemConfiguration>(configKey(spreadsheetId));
}

export function setCachedConfiguration(
  spreadsheetId: string,
  config: SystemConfiguration
) {
  cacheSet(configKey(spreadsheetId), config);
}

export function invalidateConfigurationCache(spreadsheetId: string) {
  cacheDelete(configKey(spreadsheetId));
}

export function invalidateAllBadmintonDomainCache(spreadsheetId: string) {
  invalidateMembersCache(spreadsheetId);
  invalidateConfigurationCache(spreadsheetId);
}

type EnsureState = {
  ensured: boolean;
  promise: Promise<void> | null;
};

function getEnsureState(): EnsureState {
  const g = globalThis as unknown as {
    __badminton_ensure_state__?: EnsureState;
  };
  if (!g.__badminton_ensure_state__) {
    g.__badminton_ensure_state__ = { ensured: false, promise: null };
  }
  return g.__badminton_ensure_state__;
}

export async function runEnsureBadmintonSheetsOnce(
  ensureFn: () => Promise<void>
): Promise<void> {
  const state = getEnsureState();
  if (state.ensured) return;
  if (!state.promise) {
    state.promise = ensureFn()
      .then(() => {
        state.ensured = true;
      })
      .catch((err) => {
        state.promise = null;
        throw err;
      });
  }
  return state.promise;
}

export function resetBadmintonSheetsEnsureState() {
  const state = getEnsureState();
  state.ensured = false;
  state.promise = null;
}
