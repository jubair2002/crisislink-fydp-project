import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test query function
export const testSupabaseConnection = async () => {
  try {
    // Assuming there is a 'test' table or any public table, we just try to fetch 1 row
    // If the table doesn't exist, it will return an error, but we'll know the connection was attempted
    const { data, error } = await supabase.from('test').select('*').limit(1);
    if (error) {
      console.error('Supabase connection test error:', error.message);
      return false;
    }
    console.log('Supabase connection test successful:', data);
    return true;
  } catch (err) {
    console.error('Supabase connection test failed:', err);
    return false;
  }
};
