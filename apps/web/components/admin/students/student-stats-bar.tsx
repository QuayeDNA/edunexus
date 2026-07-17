'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { StatsData } from '@/types/students';

interface StudentStatsBarProps {
  stats: StatsData;
  activeStatus: string | null;
  onStatusChange: (status: string | null) => void;
  onClassFilter: (className: string | null) => void;
}

const statusConfig: Record<string, { label: string }> = {
  active: { label: 'Active' },
  withdrawn: { label: 'Withdrawn' },
  transferred_out: { label: 'Transferred' },
  graduated: { label: 'Graduated' },
};

export function StudentStatsBar({ stats, activeStatus, onStatusChange, onClassFilter }: StudentStatsBarProps) {
  const statusCounts = Object.fromEntries(stats.byStatus.map(s => [s.status, s.count]));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-3">
        <Card
          className={`cursor-pointer transition-shadow hover:shadow-md ${activeStatus === null ? 'ring-2 ring-primary' : ''}`}
          onClick={() => onStatusChange(null)}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">All</p>
          </CardContent>
        </Card>
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = statusCounts[key] ?? 0;
          const isActive = activeStatus === key;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-shadow hover:shadow-md ${isActive ? 'ring-2 ring-primary' : ''}`}
              onClick={() => onStatusChange(key)}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {stats.byClass.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Classes:</span>
          {stats.byClass.slice(0, 8).map(c => (
            <button key={c.className}
              onClick={() => onClassFilter(c.className)}
              className="rounded-full border bg-muted/30 px-3 py-1 text-xs transition-colors hover:bg-muted">
              {c.className}: {c.count}
            </button>
          ))}
          {stats.byClass.length > 8 && (
            <span className="text-xs text-muted-foreground">+{stats.byClass.length - 8} more</span>
          )}
        </div>
      )}
    </div>
  );
}
