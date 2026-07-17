"use client";

import type { GuardianRow } from "@/types/students";

export function StudentGuardians({ guardians }: { guardians: GuardianRow[] }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Guardians
      </h3>
      {guardians.length === 0 ? (
        <p className="text-sm text-muted-foreground">No guardians recorded</p>
      ) : (
        <div className="space-y-2">
          {guardians.map((g) => (
            <div key={g.id} className="rounded-md bg-muted px-3 py-2 text-sm">
              <p className="font-medium">
                {g.firstName} {g.lastName} ({g.relationship})
                {g.isPrimary ? " · Primary" : ""}
              </p>
              <p className="text-muted-foreground">
                {g.phone ?? "—"} · {g.email ?? "—"}
              </p>
              {g.occupation && (
                <p className="text-muted-foreground">{g.occupation}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
