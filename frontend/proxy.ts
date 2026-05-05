import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/audit'];
const publicAuthRoutes = ['/login'];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some(r => path.startsWith(r));
  const isPublicAuth = publicAuthRoutes.some(r => path.startsWith(r));
  const token = request.cookies.get('auth_token')?.value;

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'auth_required');
    return NextResponse.redirect(url);
  }

  if (isPublicAuth && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)', '/'],
};
