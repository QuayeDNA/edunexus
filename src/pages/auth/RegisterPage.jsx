import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, Mail, Lock, User, Phone, Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient.js';
import { schoolsApi } from '../../services/api/schools.js';
import { cn } from '../../utils/cn.js';

const schema = yup.object({
  schoolName: yup.string().min(3, 'School name must be at least 3 characters').required('School name is required'),
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  phone: yup.string().matches(/^[0-9]{10}$/, 'Enter a valid 10-digit phone number').required('Phone is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});

const getPasswordStrength = (password) => {
  if (!password) return { level: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-status-danger' };
  if (score <= 2) return { level: 2, label: 'Fair', color: 'bg-status-warning' };
  if (score <= 3) return { level: 3, label: 'Good', color: 'bg-brand-500' };
  return { level: 4, label: 'Strong', color: 'bg-status-success' };
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });

  const passwordValue = watch('password', '');
  const strength = getPasswordStrength(passwordValue);

  const onSubmit = async ({ schoolName, firstName, lastName, email, phone, password }) => {
    try {
      // School creation is now restricted to super administrators only
      // Users should be invited to join existing schools
      toast.error('School registration is currently disabled. Please contact an administrator to be invited to a school.');
      return;

      // 1. Create school record first
      const school = await schoolsApi.create({
        name: schoolName,
        email,
        phone,
        curriculum_mode: 'ghana_basic',
        calendar_mode: 'trimester',
        grading_system: 'ghana_basic',
        currency_code: 'GHS',
        timezone: 'Africa/Accra',
        country: 'GH',
      });

      // 2. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      });
      if (authError) throw authError;

      // 3. Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        school_id: school.id,
        role: 'admin',
        first_name: firstName,
        last_name: lastName,
        phone,
        is_active: true,
      });
      if (profileError) throw profileError;

      toast.success('Account created! Let\'s set up your school.');
      navigate('/onboarding');
    } catch (err) {
      toast.error(err.message ?? 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Create your school account</h2>
        <p className="text-text-secondary text-sm mt-1">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* School name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="schoolName">
            School name
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              id="schoolName"
              type="text"
              placeholder="Accra Academy Basic School"
              className={cn('input-base pl-9', errors.schoolName && 'border-status-danger')}
              {...register('schoolName')}
            />
          </div>
          {errors.schoolName && <p className="mt-1 text-xs text-status-danger">{errors.schoolName.message}</p>}
        </div>

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="firstName">First name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input id="firstName" type="text" placeholder="Kwame" className={cn('input-base pl-9', errors.firstName && 'border-status-danger')} {...register('firstName')} />
            </div>
            {errors.firstName && <p className="mt-1 text-xs text-status-danger">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="lastName">Last name</label>
            <input id="lastName" type="text" placeholder="Mensah" className={cn('input-base', errors.lastName && 'border-status-danger')} {...register('lastName')} />
            {errors.lastName && <p className="mt-1 text-xs text-status-danger">{errors.lastName.message}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="email">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input id="email" type="email" autoComplete="email" placeholder="admin@yourschool.edu.gh" className={cn('input-base pl-9', errors.email && 'border-status-danger')} {...register('email')} />
          </div>
          {errors.email && <p className="mt-1 text-xs text-status-danger">{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="phone">Phone number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input id="phone" type="tel" placeholder="0244000000" className={cn('input-base pl-9', errors.phone && 'border-status-danger')} {...register('phone')} />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-status-danger">{errors.phone.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="password">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" className={cn('input-base pl-9 pr-10', errors.password && 'border-status-danger')} {...register('password')} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" aria-label="Toggle password">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Strength meter */}
          {passwordValue && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', i <= strength.level ? strength.color : 'bg-border')} />
                ))}
              </div>
              <p className={cn('text-xs font-medium', strength.level <= 1 ? 'text-status-danger' : strength.level <= 2 ? 'text-status-warning' : 'text-status-success')}>
                {strength.label}
              </p>
            </div>
          )}
          {errors.password && <p className="mt-1 text-xs text-status-danger">{errors.password.message}</p>}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="confirmPassword">Confirm password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} placeholder="Repeat password" className={cn('input-base pl-9 pr-10', errors.confirmPassword && 'border-status-danger')} {...register('confirmPassword')} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" aria-label="Toggle confirm password">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-xs text-status-danger">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create school account →'}
        </button>

        <p className="text-xs text-text-muted text-center">
          By creating an account you agree to our{' '}
          <a href="#" className="text-brand-600 hover:underline">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="text-brand-600 hover:underline">Privacy Policy</a>
        </p>
      </form>
    </div>
  );
}
