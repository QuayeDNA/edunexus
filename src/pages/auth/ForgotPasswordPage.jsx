import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../services/api/auth.js';
import { cn } from '../../utils/cn.js';

const schema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
});

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async ({ email }) => {
    try {
      await authApi.resetPassword(email);
      setSentEmail(email);
      setSent(true);
    } catch (err) {
      toast.error(err.message ?? 'Failed to send reset email');
    }
  };

  if (sent) {
    return (
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-status-successBg flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-status-success" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Check your email</h2>
        <p className="text-text-secondary text-sm mb-2">
          We sent password reset instructions to:
        </p>
        <p className="text-text-primary font-semibold text-sm mb-6">{sentEmail}</p>
        <p className="text-text-muted text-xs mb-6">
          Didn't receive it? Check your spam folder or try again.
        </p>
        <Link to="/login" className="btn-primary inline-flex">
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </Link>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary">Reset your password</h2>
        <p className="text-text-secondary text-sm mt-1">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
              className={cn('input-base pl-9', errors.email && 'border-status-danger')}
              {...register('email')}
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-status-danger">{errors.email.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send reset link'}
        </button>
      </form>
    </div>
  );
}
