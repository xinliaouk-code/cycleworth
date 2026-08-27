import { createClient } from '@supabase/supabase-js'

// 从环境变量中安全地读取密钥（附带有降级默认值，避免构建或未配置时直接抛错崩掉）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-publishable-key'

// 创建并导出一个“桥梁”，以后我们任何页面需要存取数据，直接调用它即可
export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'personal_cycleworth' },
})
