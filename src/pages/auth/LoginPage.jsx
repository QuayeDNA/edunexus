import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { authApi } from '../../services/api/auth.js';
import { cn } from '../../utils/cn.js';

const schema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, role } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');

  const from = location.state?.from?.pathname ?? null;

  const roleDashboards = {
    admin: '/admin/dashboard',
    super_admin: '/admin/dashboard',
    teacher: '/teacher/dashboard',
    student: '/student/dashboard',
    parent: '/parent/dashboard',
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async ({ email, password }) => {
    try {
      await signIn(email, password);
      // AuthContext will update role; navigate after a tick
      setTimeout(() => {
        const dest = from ?? roleDashboards[role] ?? '/admin/dashboard';
        navigate(dest, { replace: true });
      }, 100);
    } catch (err) {
      toast.error(err.message ?? 'Invalid email or password');
    }
  };

  const handleMagicLink = async () => {
    const email = getValues('email');
    if (!email) {
      toast.error('Enter your email address first');
      return;
    }
    try {
      await authApi.signInWithMagicLink(email);
      setMagicLinkEmail(email);
      setMagicLinkSent(true);
      toast.success('Magic link sent! Check your inbox.');
    } catch (err) {
      toast.error(err.message ?? 'Failed to send magic link');
    }
  };

  if (magicLinkSent) {
    return (
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Check your inbox</h2>
        <p className="text-text-secondary text-sm mb-6">
          We sent a magic sign-in link to <strong>{magicLinkEmail}</strong>
        </p>
        <button
          onClick={() => setMagicLinkSent(false)}
          className="text-sm text-brand-600 hover:underline"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary">Sign in to your school</h2>
        <p className="text-text-secondary text-sm mt-1">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-600 font-semibold hover:underline">
            Create one free
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="email">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@yourschool.edu.gh"
              className={cn('input-base pl-9', errors.email && 'border-status-danger focus:ring-status-danger')}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-status-danger">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-text-primary" htmlFor="password">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-brand-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={cn('input-base pl-9 pr-10', errors.password && 'border-status-danger focus:ring-status-danger')}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-status-danger">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-muted">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Magic link */}
        <button
          type="button"
          onClick={handleMagicLink}
          className="btn-secondary w-full"
        >
          <Mail className="w-4 h-4" />
          Sign in with magic link
        </button>
      </form>

      {/* Demo credentials hint */}
      <div className="mt-6 p-3 bg-surface-muted rounded-lg border border-border">
        <p className="text-xs text-text-muted text-center">
          <span className="font-medium text-text-secondary">Demo: </span>
          admin@edunexus.demo · Demo1234!
        </p>
      </div>
    </div>
  );
}
