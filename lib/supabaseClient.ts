
// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
// export const supabase = createClient(supabaseUrl, supabaseKey);

// // Types for our database
// export interface Document {
//     id: string
//     user_id: string
//     file_name: string
//     file_path: string
//     file_size: number
//     mime_type: string
//     document_key: string
//     created_at: string
//   }
    

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Document {
  id: string
  user_id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  document_key: string
  created_at: string
}