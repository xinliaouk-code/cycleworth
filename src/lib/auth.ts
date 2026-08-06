import { createClient } from '@supabase/supabase-js'

/**
 * 在服务端校验 Supabase 会话。
 *
 * 之前 API 路由直接信任客户端传来的 `userId`，这会导致越权（IDOR）：
 * 任何登录用户只要猜到/知道别人的 userId，就能操作/覆盖别人的数据。
 *
 * 现在要求客户端在请求中带上自己的 accessToken，由服务端调用 Supabase
 * 校验该 token，并返回对应的真实 user id，从而完全忽略客户端声称的 userId。
 *
 * @param accessToken 客户端 session 的 access_token（必填）
 * @returns 校验通过时返回真实 user id，否则返回 null
 */
export async function verifySession(accessToken?: string): Promise<string | null> {
  if (!accessToken) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) return null
  return data.user.id
}
