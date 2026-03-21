import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../services/api/auth.js';
import { cn } from '../../utils/cn.js';

const schema = yup.object({
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});

/**
 * ResetPasswordPage
 *
 * The user lands here after clicking the password-reset link in their email.
 * Supabase (PKCE flow) will have already exchanged the one-time token for a
 * session via the /auth/callback route, so auth.updateUser() works immediately.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async ({ password }) => {
    try {
      await authApi.updatePassword(password);
      setDone(true);
    } catch (err) {
      toast.error(err.message ?? 'Failed to update password. Please try again.');
    }
  };

  if (done) {
    return (
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-status-successBg flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-status-success" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Password updated!</h2>
        <p className="text-text-secondary text-sm mb-6">
          Your password has been changed. You can now sign in with your new password.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="btn-primary inline-flex"
        >
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary">Set a new password</h2>
        <p className="text-text-secondary text-sm mt-1">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* New password */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="password">
            New password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className={cn('input-base pl-9 pr-10', errors.password && 'border-status-danger')}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-status-danger">{errors.password.message}</p>}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="confirmPassword">
            Confirm new password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat password"
              className={cn('input-base pl-9 pr-10', errors.confirmPassword && 'border-status-danger')}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              aria-label="Toggle confirm password visibility"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-xs text-status-danger">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating password…</>
            : 'Update password'}
        </button>
      </form>
    </div>
  );
}
