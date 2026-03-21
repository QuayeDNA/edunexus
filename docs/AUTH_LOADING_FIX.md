# 🔧 Fix: Auth State Stuck on Loading After Hard Refresh

## Summary of Issues

You had **two critical bugs** preventing auth from initializing properly on hard refresh:

### 1. **Missing Error Handling in Auth Context** ❌
When `loadProfile()` threw an error during `INITIAL_SESSION`, the app never called `setLoading(false)` and `setInitialized(true)`, leaving it frozen on the loading screen.

**Status**: ✅ FIXED in `src/contexts/AuthContext.jsx`

### 2. **Circular RLS Policy Dependency** ❌  
The profiles RLS policy used `get_my_school_id()` which queries the profiles table. This creates a circular dependency that can hang indefinitely during page load:

```sql
-- ❌ BROKEN:
create policy "Profiles: own or same school"
  on profiles for all
  using (id = auth.uid() or school_id = get_my_school_id());
  -- ↑ This calls the helper which queries profiles again!
```

**Status**: ✅ FIXED in `src/db/schema.sql` and migration SQL

### 3. **No Timeout Protection** ❌
Profile fetch could hang indefinitely with no fallback.

**Status**: ✅ FIXED with 10-second timeout in `AuthContext.jsx`

---

## Files Changed

### 1. ✅ `src/contexts/AuthContext.jsx`
- Added try-catch-finally blocks to ensure `setLoading(false)` always runs
- Added 10-second timeout to profile fetch
- Better error logging for debugging

### 2. ✅ `src/services/api/auth.js`
- Improved error handling for missing profiles
- Better error codes and logging

### 3. ✅ `src/db/schema.sql`
- Replaced circular RLS policy with three separate policies:
  - `Profiles: read own profile` - users can always read their own
  - `Profiles: update own profile` - users can update their own  
  - `Profiles: admin can view all in school` - admins see all profiles
  - `Profiles: allow insert own` - users can create their profile on signup

---

## 🚀 How to Apply the Fix

### Step 1: Update Your Code (Already Done)
Your TypeScript/React files are already updated. Just restart your dev server.

### Step 2: Apply RLS Policy Change to Supabase (IMPORTANT!)
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Copy and paste the entire content of: `src/db/migrations/001_fix_auth_rls.sql`
5. Click **Execute**

### Step 3: Verify the Fix
After applying the SQL:
1. Hard refresh your app (Ctrl+R or Cmd+R)
2. You should NOT see the infinite loading screen
3. You should either:
   - Login successfully, or
   - See the login page (if not authenticated)

---

## Testing the Fix

### Test Case 1: Login Flow
1. Go to login page
2. Login with valid credentials
3. Should redirect to dashboard ✓

### Test Case 2: Hard Refresh While Logged In
1. Login successfully
2. Press Ctrl+R (or Cmd+R to refresh)
3. Should restore session quickly without infinite loading ✓

### Test Case 3: Check Browser Console
Open DevTools (F12) and look for logs like:
```
✅ [API] Profile loaded successfully: user-id-here
✅ [Auth] Session restored from cache
```

If you see errors, take note of them and share for further debugging.

---

## 🐛 If Issues Persist

### Check RLS Policies in Supabase
1. Supabase Dashboard → **Authentication** → **Policies**
2. Look for these policies on the **profiles** table:
   - ✓ `Profiles: read own profile`
   - ✓ `Profiles: update own profile`
   - ✓ `Profiles: admin can view all in school`
   - ✓ `Profiles: allow insert own`

3. Make sure old policy is gone:
   - ✗ `Profiles: own or same school` (should NOT exist)

### Check Browser DevTools
- **Console tab**: Look for error messages about RLS or profile fetch
- **Network tab**: Check if profile query times out (>10s)

### Clear Browser Cache
1. Clear LocalStorage: `localStorage.clear()`
2. Restart dev server
3. Try login/refresh again

---

## Root Cause Analysis

The issue occurred because:

1. **On Hard Refresh**:
   - Browser requests the page
   - `onAuthStateChange` fires with `INITIAL_SESSION` event
   - App tries to restore user session from Supabase token

2. **RLS Block**:
   - RLS policy checks: `id = auth.uid() or school_id = get_my_school_id()`
   - `get_my_school_id()` queries: `SELECT school_id FROM profiles WHERE id = auth.uid()`
   - This creates a circular dependency - checking access to profiles requires querying profiles!
   - Query hangs or RLS silently blocks access

3. **Auth Freeze**:
   - Since profile fetch hung or failed, `await loadProfile()` never completed
   - Code after the await never executed (no `setLoading(false)`)
   - App stays on loading screen forever

---

## Prevention Tips

✅ **Always use try-catch-finally** for async state updates
✅ **Never use self-referential queries in RLS policies** - use `auth.uid()` directly
✅ **Always add timeout protection** for network-dependent initialization
✅ **Test hard refresh** regularly as part of dev workflow

