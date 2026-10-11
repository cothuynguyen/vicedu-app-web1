import { createBrowserClient } from '@supabase/ssr'

const TEN_HOURS = 36000 // 10 tiếng (hết ca làm việc thì phiên tự hết hạn)

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: TEN_HOURS,
        sameSite: 'lax',
        path: '/',
      },
    }
  )
}
