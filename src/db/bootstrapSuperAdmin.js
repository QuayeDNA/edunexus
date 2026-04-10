/**
 * Bootstrap or promote a platform super admin account.
 *
 * Usage:
 *   npm run seed:super-admin
 *   npm run seed:super-admin -- --email your@email.com --password "StrongPass123!"
 *   npm run seed:super-admin -- --email your@email.com --first-name Jane --last-name Doe
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const DEFAULT_EMAIL = 'superadmin@edunexus.demo';
const DEFAULT_PASSWORD = 'Demo1234!';
const DEFAULT_FIRST_NAME = 'Platform';
const DEFAULT_LAST_NAME = 'Admin';

const readArg = (name) => {
  const flag = `--${name}`;
  const inline = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) {
    return inline.slice(flag.length + 1);
  }

  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const printUsage = () => {
  console.log('Bootstrap super admin account');
  console.log('');
  console.log('Options:');
  console.log('  --email <email>           Account email (default superadmin@edunexus.demo)');
  console.log('  --password <password>     Account password (default Demo1234!)');
  console.log('  --first-name <name>       First name (default Platform)');
  console.log('  --last-name <name>        Last name (default Admin)');
  console.log('  --help                    Show this message');
};

const findUserByEmail = async (client, email) => {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const found = users.find((candidate) => String(candidate.email ?? '').toLowerCase() === email);
    if (found) {
      return found;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
};

const main = async () => {
  if (hasFlag('help') || hasFlag('h')) {
    printUsage();
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  }

  const email = String(readArg('email') ?? DEFAULT_EMAIL).trim().toLowerCase();
  const password = String(readArg('password') ?? DEFAULT_PASSWORD);
  const firstNameArg = readArg('first-name');
  const lastNameArg = readArg('last-name');

  if (!email.includes('@')) {
    throw new Error('Please provide a valid email via --email.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log(`Checking auth user for ${email}...`);
  let authUser = await findUserByEmail(supabase, email);

  const effectiveFirstName = String(firstNameArg ?? DEFAULT_FIRST_NAME).trim() || DEFAULT_FIRST_NAME;
  const effectiveLastName = String(lastNameArg ?? DEFAULT_LAST_NAME).trim() || DEFAULT_LAST_NAME;

  if (!authUser) {
    console.log('Creating auth user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: effectiveFirstName,
        last_name: effectiveLastName,
      },
    });

    if (error) {
      throw error;
    }

    authUser = data.user;
  } else {
    console.log('Auth user exists. Updating password + metadata...');
    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
      password,
      email_confirm: true,
      ban_duration: 'none',
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        first_name: effectiveFirstName,
        last_name: effectiveLastName,
      },
    });

    if (error) {
      throw error;
    }

    authUser = data.user ?? authUser;
  }

  if (!authUser?.id) {
    throw new Error('Failed to resolve auth user id for super admin bootstrap.');
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('id, role, school_id, first_name, last_name, is_active')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  const profileFirstName = existingProfile?.first_name ?? effectiveFirstName;
  const profileLastName = existingProfile?.last_name ?? effectiveLastName;

  console.log('Upserting profile with role=super_admin...');
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: authUser.id,
        school_id: null,
        role: 'super_admin',
        first_name: profileFirstName,
        last_name: profileLastName,
        is_active: true,
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    throw profileError;
  }

  const { error: unbanError } = await supabase.auth.admin.updateUserById(authUser.id, {
    ban_duration: 'none',
  });

  if (unbanError) {
    throw unbanError;
  }

  console.log('');
  console.log('✅ Super admin is ready');
  console.log(`User ID: ${authUser.id}`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Previous role: ${existingProfile?.role ?? 'none'}`);
  console.log('');
  console.log('Next: sign in from /login and open /super-admin/dashboard');
};

main().catch((error) => {
  console.error('❌ Super admin bootstrap failed:', error.message ?? error);
  process.exit(1);
});
