import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jxyavtdmcloxnhuavokc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWF2dGRtY2xveG5odWF2b2tjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI1ODkzMSwiZXhwIjoyMDkzODM0OTMxfQ.t2FitrquQlFXdJk6vZwsdbzDKcv_gY9CeZwWjU-adLk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('listings').select('count').limit(1);
    if (error) {
      console.error('Connection failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Connection error:', err.message);
    return false;
  }
}

testConnection();