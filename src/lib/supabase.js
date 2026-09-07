import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabase public configuration is missing')
}

export const weddingSlug = import.meta.env.VITE_WEDDING_SLUG || 'cloyd-cyrin'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

export async function searchEntourage(search) {
  const { data, error } = await supabase.rpc('search_wedding_entourage', {
    p_wedding_slug: weddingSlug,
    p_search: search,
  })

  if (error) throw error
  return data ?? []
}

export async function submitEntourageResponse({ entourageId, response, message }) {
  const { data, error } = await supabase.rpc('respond_to_wedding_entourage', {
    p_wedding_slug: weddingSlug,
    p_entourage_id: entourageId,
    p_response: response,
    p_message: message || null,
  })

  if (error) throw error
  return data
}
