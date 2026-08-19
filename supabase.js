import { createClient } from '@supabase/supabase-js'

const fallbackUrl = 'https://givfuaphcjyvvumztdcl.supabase.co'
const fallbackPublishableKey = 'sb_publishable_Ku_p9bnamaHCZpFZF3DyeA_TinFCo_5'

const url = import.meta.env.VITE_SUPABASE_URL || fallbackUrl
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey

export const cloudEnabled = Boolean(url && key)

export const supabase = cloudEnabled
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null

export const supabaseProjectUrl = url
