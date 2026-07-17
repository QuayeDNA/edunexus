"use client";

import type { ApplicantStats } from "@/types/applicant";
import { Card, CardContent } from "@/components/ui/card";

interface StatsBarProps {
  stats: ApplicantStats;
  activeStatus: string | null;
  onStatusChange: (status: string | null) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  submitted: {
    label: "Submitted",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  under_review: {
    label: "Under Review",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  accepted: {
    label: "Accepted",
    color: "bg-green-50 text-green-700 border-green-200",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-50 text-red-700 border-red-200",
  },
  waitlisted: {
    label: "Waitlisted",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

export function ApplicantStatsBar({
  stats,
  activeStatus,
  onStatusChange,
}: StatsBarProps) {
  const allActive = activeStatus === null;

  return (
    <div className="grid grid-cols-6 gap-3">
      <Card
        className={`cursor-pointer transition-shadow hover:shadow-md ${allActive ? "ring-2 ring-primary" : ""}`}
        onClick={() => onStatusChange(null)}
      >
        <CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">All</p>
        </CardContent>
      </Card>
      {Object.entries(statusConfig).map(([key, config]) => {
        const isActive = activeStatus === key;
        return (
          <Card
            key={key}
            className={`cursor-pointer transition-shadow hover:shadow-md ${isActive ? "ring-2 ring-primary" : ""}`}
            onClick={() => onStatusChange(key)}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {stats[key as keyof ApplicantStats]}
              </p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
