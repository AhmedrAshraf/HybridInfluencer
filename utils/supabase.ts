import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://vwkjcwzfnpqskjtwwuxr.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3a2pjd3pmbnBxc2tqdHd3dXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0MzQzODQsImV4cCI6MjA1NzAxMDM4NH0.zs5LSuk-ZAI3zxQocyNYe9_DH3qSOFxe4PRqL5isBXg';
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // disable this in mobile apps
  },
});
