import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test'

const PASSWORD = 'e2e-password-1'

let counter = 0
const unique = () => `${Date.now().toString(36)}${(counter++).toString(36)}`

export type TUser = { name: string; email: string; password: string; id: string }

// Registers a throwaway account and signs the request context in through NextAuth's own
// credentials endpoint, so the browser context holding it is logged in on its next page load.
export const createUser = async (request: APIRequestContext, name: string): Promise<TUser> => {
    const email = `${name.toLowerCase()}-${unique()}@e2e.test`
    const register = await request.post('/api/auth/register', { data: { name, email, password: PASSWORD } })
    expect(register.status()).toBe(201)
    const { user } = (await register.json()) as { user: { id: string } }

    await signIn(request, email, PASSWORD)
    return { name, email, password: PASSWORD, id: user.id }
}

export const signIn = async (request: APIRequestContext, email: string, password: string) => {
    const { csrfToken } = (await (await request.get('/api/auth/csrf')).json()) as { csrfToken: string }
    return request.post('/api/auth/callback/credentials', {
        form: { csrfToken, email, password, json: 'true' },
    })
}

// A separate browser context per person, so their sessions never mix.
export const newPerson = async (browser: Browser, name: string): Promise<{ user: TUser; context: BrowserContext; page: Page }> => {
    const context = await browser.newContext()
    const user = await createUser(context.request, name)
    return { user, context, page: await context.newPage() }
}

export const api = async <T>(request: APIRequestContext, method: 'post' | 'put', url: string, data: unknown, status = 200) => {
    const res = await request[method](url, { data })
    expect(res.status(), `${method.toUpperCase()} ${url}`).toBe(status)
    return (await res.json()) as T
}

export const createWishlist = (request: APIRequestContext, name: string, isPublic = true) =>
    api<{ id: string }>(request, 'post', '/api/wishlist', { name, isPublic, allowSuggestions: true, eventDate: '2999-01-01' }, 201)

export const createWish = (request: APIRequestContext, wishlistId: string, name: string, price = 100) =>
    api<{ id: string }>(request, 'post', '/api/wish', { wishlistId, name, price }, 201)
