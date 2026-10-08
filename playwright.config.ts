import { defineConfig } from '@playwright/test'

// End-to-end tests run the real app on Turbopack dev with an in-memory KV (E2E_FAKE_KV=1, see
// next.config.ts), so they never touch a database. The port is not 3000 so a running dev
// server is left alone.
const PORT = 3100
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false, // one shared in-memory KV; tests use unique emails but run serially for clarity
    workers: 1,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL,
        // The machine's Chrome, so no browser download is needed; remove to use `playwright install`.
        channel: 'chrome',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: `npx next dev --turbopack --port ${PORT}`,
        url: `${baseURL}/en`,
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
            E2E_FAKE_KV: '1',
            // Process env beats .env.local, so a stray real KV connection fails loudly instead
            // of reaching a database: with the alias working, none of these are ever used.
            KV_REST_API_URL: 'http://127.0.0.1:9',
            KV_REST_API_TOKEN: 'e2e-unused',
            KV_REST_API_READ_ONLY_TOKEN: 'e2e-unused',
            KV_URL: 'redis://127.0.0.1:9',
            REDIS_URL: 'redis://127.0.0.1:9',
            NEXTAUTH_URL: baseURL,
            NEXTAUTH_SECRET: 'e2e-only-secret',
            GOOGLE_CLIENT_ID: 'e2e',
            GOOGLE_CLIENT_SECRET: 'e2e',
        },
    },
})
