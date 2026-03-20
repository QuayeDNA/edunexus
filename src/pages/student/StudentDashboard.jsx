import { Construction } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Student Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Your schedule, grades, and more</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-border shadow-card p-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
          <Construction className="w-8 h-8 text-brand-400" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Student Dashboard — Coming in Phase 3+</h3>
        <p className="text-sm text-text-secondary max-w-sm mx-auto mb-6">
          This module is scaffolded and ready to build. Follow the phase order in the project README.
        </p>
        <Link to="/admin/dashboard" className="btn-primary inline-flex">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
