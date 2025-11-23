import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qfzpcaokhttkdvfgvigl.supabase.co'

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmenBjYW9raHR0a2R2Zmd2aWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjY1MDIsImV4cCI6MjA3OTQ0MjUwMn0.sqckiRmxr1vv5AFmn0aAUkbyT0qFkdZL9bIxcac8p0Q'

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase

