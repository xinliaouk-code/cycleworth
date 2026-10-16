type AuthErrorLike = {
  message?: unknown
  code?: unknown
  error_code?: unknown
}

function readMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (!error || typeof error !== 'object') return ''

  const candidate = error as AuthErrorLike
  return typeof candidate.message === 'string' ? candidate.message : ''
}

/** Convert common Neon Auth responses into actionable Chinese copy. */
export function getAuthErrorMessage(error: unknown) {
  const message = readMessage(error)
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials') || normalized.includes('invalid_credentials') || normalized.includes('invalid email or password')) {
    return '邮箱或密码不正确。如果你刚注册，请先打开确认邮件；也可以使用“忘记密码”重设密码。'
  }

  if (normalized.includes('email not confirmed')) {
    return '请先打开邮箱中的确认链接，再登录 CycleWorth。'
  }

  if (normalized.includes('user already registered')) {
    return '该邮箱已经注册，请直接登录或使用“忘记密码”重设密码。'
  }

  if (normalized.includes('password should be at least')) {
    return '密码至少需要 8 个字符。'
  }

  if (normalized.includes('rate limit')) {
    return '操作过于频繁，请稍等几分钟后再试。'
  }

  if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return '无法连接到认证服务，请稍后重试。'
  }

  return message || '登录失败，请检查网络后重试。'
}
