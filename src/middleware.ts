import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip middleware for API routes that handle member creation
  if (request.nextUrl.pathname === '/api/groups/create' || 
      request.nextUrl.pathname === '/api/groups/join') {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  
  // Check if memberId cookie exists
  const memberId = request.cookies.get('memberId')?.value;
  if (!memberId && request.nextUrl.pathname.startsWith('/groups')) {
    // Generate a temporary memberId
    const newMemberId = 'temp-' + Math.random().toString(36).substring(7);
    
    // Set the cookie
    response.cookies.set({
      name: 'memberId',
      value: newMemberId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  
  return response;
}

export const config = {
  matcher: [
    '/groups/:path*',
    '/api/groups/:path*'
  ],
}; 