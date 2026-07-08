'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { LayoutDashboard, Users, CalendarCheck, DollarSign, LogOut } from 'lucide-react';
import { APP_NAME } from '@/lib/utils/constants';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/parent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/parent/children', label: 'My Children', icon: Users },
  { href: '/parent/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/parent/fees', label: 'Fees', icon: DollarSign },
];

export function ParentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border px-6 py-5">
        <Users className="h-6 w-6 text-brand-600" />
        <span className="text-lg font-semibold text-text-primary">{APP_NAME}</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-brand-50 text-brand-700'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sm text-text-secondary"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
