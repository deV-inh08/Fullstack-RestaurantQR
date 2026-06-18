import { NextRequest } from 'next/server'
import { proxyRequest } from '@/src/lib/server-fetch'

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
