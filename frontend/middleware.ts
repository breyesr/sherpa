import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sherpa_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. If no token and trying to access protected route
  if (!token && !pathname.startsWith('/auth')) {
    // Only redirect if it's not the onboarding page (which handles its own state)
    // Actually, onboarding also needs auth, so it's fine.
    if (pathname !== '/') {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // 2. If token exists and trying to access auth pages, go to dashboard
  if (token && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
