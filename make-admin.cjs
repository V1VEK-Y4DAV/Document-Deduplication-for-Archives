// Simple script to make a user an admin
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Get Supabase credentials from environment variables
// Try service key first, fallback to publishable key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseKey = supabaseServiceKey || supabasePublishableKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function makeUserAdmin(email) {
  try {
    console.log(`Looking for user with email: ${email}`);
    
    // Find the user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error finding user:', profileError);
      return;
    }

    if (!profile) {
      console.log('No user found with that email. Please create a user first.');
      console.log('You can do this by signing up through the application or using the create-user.cjs script.');
      return;
    }

    console.log('Found user:', profile);

    // Check if user already has admin role
    const { data: existingRole, error: roleError } = await supabase
      .from('user_roles')
      .select('id, role')
      .eq('user_id', profile.id)
      .eq('role', 'admin')
      .single();

    if (existingRole) {
      console.log('User is already an admin');
      return;
    }

    // Make user an admin
    const { error: upsertError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: profile.id,
        role: 'admin',
        assigned_at: new Date().toISOString(),
        assigned_by: profile.id
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error making user admin:', upsertError);
      return;
    }

    console.log(`Successfully made ${profile.email} an admin!`);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'vivekyadav@example.com';
makeUserAdmin(email);