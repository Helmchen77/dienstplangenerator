import { createClient } from '@supabase/supabase-js'

// Project ID injected from the Supabase connection
const SUPABASE_URL = 'https://qdpeavtbahgcuvngqneo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcGVhdnRiYWhnY3V2bmdxbmVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NzI2NzAsImV4cCI6MjA3MDE0ODY3MH0.AL6PQFwdso8zLtlw1DU-_41a9us2k-6KyohN8naEIFc'

if (SUPABASE_URL === 'https://<PROJECT-ID>.supabase.co' || SUPABASE_ANON_KEY === '<ANON_KEY>') {
  throw new Error('Missing Supabase variables');
}

export default createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})