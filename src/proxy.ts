import createMiddleware from 'next-intl/middleware';
import { routing } from '@/shared/i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except api routes, _next internals, and static files
    '/((?!api|_next|icons|.*\\..*).*)',
  ],
};
