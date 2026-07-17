"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AcceptApplicantDialog } from "./accept-applicant-dialog";

interface ActionsProps {
  applicantId: string;
  status: string;
  gradeLevelId: string;
}

const validActions: Record<string, string[]> = {
  submitted: ["under_review", "rejected"],
  under_review: ["accepted", "rejected", "waitlisted"],
  waitlisted: ["accepted", "rejected"],
};

const actionLabels: Record<string, string> = {
  under_review: "Mark Under Review",
  accepted: "Accept",
  rejected: "Reject",
  waitlisted: "Waitlist",
};

export function ApplicantActions({
  applicantId,
  status,
  gradeLevelId,
}: ActionsProps) {
  const router = useRouter();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const allowed = validActions[status] ?? [];

  const handleAction = async (newStatus: string) => {
    if (newStatus === "accepted") {
      setAcceptOpen(true);
      return;
    }

    setSubmitting(newStatus);
    setError("");

    try {
      const res = await fetch(`/api/applicants/${applicantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to update status");
        return;
      }

      router.refresh();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {allowed.map((action) => (
            <Button
              key={action}
              variant={
                action === "rejected"
                  ? "destructive"
                  : action === "accepted"
                    ? "default"
                    : "outline"
              }
              onClick={() => handleAction(action)}
              disabled={submitting !== null}
            >
              {submitting === action
                ? "Processing..."
                : (actionLabels[action] ?? action)}
            </Button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <AcceptApplicantDialog
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        applicantId={applicantId}
        gradeLevelId={gradeLevelId}
        onSuccess={() => router.refresh()}
        onError={setError}
      />
    </>
  );
}
