import { createFakeKv, type TFakeKv } from './fakeKv'

// Stands in for `@vercel/kv` when the dev server runs with E2E_FAKE_KV=1 (see next.config.ts).
// One instance per process, kept on globalThis because dev bundles can load this module twice.
const g = globalThis as typeof globalThis & { __kageoE2eKv?: TFakeKv }
export const kv = (g.__kageoE2eKv ??= createFakeKv())
