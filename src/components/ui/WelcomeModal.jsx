import { useNavigate } from 'react-router-dom';
import { GraduationCap, Building2, CreditCard, X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const quickStartActions = [
  {
    icon: Building2,
    title: 'Add your first class',
    description: 'Create a class and assign a class teacher to get started.',
    action: '/admin/classes',
    color: 'bg-brand-50 text-brand-600',
  },
  {
    icon: GraduationCap,
    title: 'Enroll your first student',
    description: 'Add student details, guardian info, and assign to a class.',
    action: '/admin/students/new',
    color: 'bg-accent-100 text-accent-600',
  },
  {
    icon: CreditCard,
    title: 'Set up fee schedule',
    description: 'Configure tuition and levy amounts per class for this term.',
    action: '/admin/finance/fees',
    color: 'bg-status-warningBg text-status-warning',
  },
];

export default function WelcomeModal({ onClose }) {
  const navigate = useNavigate();

  const handleAction = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-scale-in">
        {/* Header */}
        <div className="relative p-6 pb-4 bg-gradient-to-br from-brand-600 to-brand-700 rounded-t-2xl text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
                <path d="M8 22L16 10L24 22H8Z" fill="white" opacity="0.9" />
                <circle cx="16" cy="18" r="3" fill="#10B981" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">Welcome to EduNexus! 🎉</h2>
              <p className="text-brand-200 text-sm">Your school is set up. Let's get started.</p>
            </div>
          </div>
        </div>

        {/* Quick start actions */}
        <div className="p-6 space-y-3">
          <p className="text-sm font-semibold text-text-secondary mb-4">
            Quick-start — complete these 3 steps to activate your school:
          </p>
          {quickStartActions.map(({ icon: Icon, title, description, action, color }, i) => (
            <button
              key={action}
              onClick={() => handleAction(action)}
              className="w-full flex items-start gap-4 p-4 rounded-xl border border-border hover:border-brand-300 hover:bg-brand-50/30 transition-all text-left group"
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm font-semibold text-text-primary group-hover:text-brand-700 transition-colors">
                    {title}
                  </p>
                </div>
                <p className="text-xs text-text-secondary pl-7">{description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full btn-secondary text-sm"
          >
            Explore the dashboard first
          </button>
        </div>
      </div>
    </div>
  );
}
