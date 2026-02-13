import { handleAuth } from '@workos-inc/authkit-nextjs';
import { createAdminClient } from '@/lib/supabase/admin';

export const GET = handleAuth({
  onSuccess: async ({ user, organizationId }) => {
    try {
      const supabase = createAdminClient();
      await supabase.from('users').upsert(
        {
          workos_user_id: user.id,
          workos_org_id: organizationId ?? null,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          avatar_url: user.profilePictureUrl,
          last_sign_in_at: new Date().toISOString(),
        },
        { onConflict: 'workos_user_id' },
      );
    } catch (error) {
      console.error('Failed to sync user to database:', error);
      // Don't re-throw — let the auth flow complete even if DB sync fails
    }
  },
});
