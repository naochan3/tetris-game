import { NextResponse } from 'next/server';

export function middleware(request) {
  // すべてのリクエストを許可する
  return NextResponse.next();
}

// ミドルウェアを適用するパスを空に設定して実質無効化
export const config = {
  matcher: [],
}; 