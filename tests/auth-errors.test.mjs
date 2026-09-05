import test from 'node:test'
import assert from 'node:assert/strict'
import { getAuthErrorMessage } from '../src/lib/auth-errors.ts'

test('explains invalid login credentials as an email confirmation or password issue', () => {
  assert.equal(
    getAuthErrorMessage({ message: 'Invalid login credentials' }),
    '邮箱或密码不正确。如果你刚注册，请先打开确认邮件；也可以使用“忘记密码”重设密码。',
  )
})

test('keeps useful Supabase auth errors visible', () => {
  assert.equal(
    getAuthErrorMessage({ message: 'User already registered' }),
    '该邮箱已经注册，请直接登录或使用“忘记密码”重设密码。',
  )
})

test('explains a missing local Supabase configuration', () => {
  assert.equal(
    getAuthErrorMessage(new TypeError('Failed to fetch')),
    '无法连接到认证服务，请检查部署中的 Supabase URL 和 Publishable/Anon Key 环境变量。',
  )
})
