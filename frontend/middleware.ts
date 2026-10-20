import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Proxy /api/* requests to the backend
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // The public site only reads. Writes (the fetch/newsletter triggers, which
    // spend Claude API credits) are never proxied from the internet.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new NextResponse(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }

    const backendUrl = process.env.API_URL || 'http://backend:8000';
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, backendUrl);

    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
