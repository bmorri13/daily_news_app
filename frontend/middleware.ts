import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Proxy /api/* requests to the backend
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const backendUrl = process.env.API_URL || 'http://backend:8000';
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, backendUrl);

    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
