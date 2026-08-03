import { createClient } from '@supabase/supabase-js'

// 从我们刚才隐藏的 .env.local 文件中安全地读取密钥
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 创建并导出一个“桥梁”，以后我们任何页面需要存取数据，直接调用它即可
export const supabase = createClient(supabaseUrl, supabaseKey)