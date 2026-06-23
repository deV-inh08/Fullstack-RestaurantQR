import { NextRequest } from 'next/server'
import { proxyRequest } from '@/src/lib/server-fetch'

// Tắt body size limit mặc định của Vercel (4.5MB) cho upload ảnh
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ path: string[] }> }

async function handle(request: NextRequest, { params }: Params) {
    const { path } = await params
    return proxyRequest(request, path)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle