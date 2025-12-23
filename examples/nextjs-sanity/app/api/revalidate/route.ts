/**
 * Revalidation API Route
 *
 * Webhook endpoint for Sanity to trigger revalidation
 * when content is updated.
 *
 * Configure in Sanity Studio:
 * https://www.sanity.io/docs/webhooks
 *
 * Webhook URL: https://your-site.com/api/revalidate
 * Secret: Set SANITY_REVALIDATE_SECRET in .env.local
 */

import { revalidateTag, revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Verify secret token
    const secret = request.nextUrl.searchParams.get('secret')
    if (secret !== process.env.SANITY_REVALIDATE_SECRET) {
      return NextResponse.json(
        { message: 'Invalid secret' },
        { status: 401 }
      )
    }

    // Parse webhook payload
    const body = await request.json()
    const { _type, slug } = body

    // Revalidate based on document type
    switch (_type) {
      case 'post':
        if (slug?.current) {
          // Revalidate specific post page
          revalidateTag(`post:${slug.current}`)
          revalidatePath(`/posts/${slug.current}`)
        }
        // Always revalidate homepage when posts change
        revalidatePath('/')
        break

      case 'author':
      case 'category':
        // Revalidate all pages when global content changes
        revalidatePath('/', 'layout')
        break

      default:
        // Revalidate everything for unknown types
        revalidatePath('/', 'layout')
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      type: _type,
      slug: slug?.current,
    })
  } catch (err) {
    const error = err as Error
    return NextResponse.json(
      { message: 'Error revalidating', error: error.message },
      { status: 500 }
    )
  }
}
