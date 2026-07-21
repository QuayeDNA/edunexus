"use client";

import type { ApplicantDetail } from "@/types/applicant";

export function ApplicantDetailInfo({
  applicant,
}: {
  applicant: ApplicantDetail;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Student Information
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">
                {applicant.firstName} {applicant.lastName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Date of Birth</dt>
              <dd>
                {new Date(applicant.dateOfBirth).toLocaleDateString("en-GH")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Applying Grade</dt>
              <dd>{applicant.gradeLevelName ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Gender</dt>
              <dd className="capitalize">{applicant.gender}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Previous School</dt>
              <dd>{applicant.previousSchool ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Guardian Information
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{applicant.guardianName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{applicant.guardianEmail}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{applicant.guardianPhone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Address</dt>
              <dd>{applicant.guardianAddress ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Occupation</dt>
              <dd>{applicant.guardianOccupation ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Employer</dt>
              <dd>{applicant.guardianEmployer ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Medical Information
          </h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Allergies</dt>
              <dd>{applicant.medicalAllergies || "None recorded"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Conditions</dt>
              <dd>{applicant.medicalConditions || "None recorded"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Medications</dt>
              <dd>{applicant.medicalMedications || "None recorded"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Doctor</dt>
              <dd>
                {applicant.doctorName
                  ? `${applicant.doctorName} (${applicant.doctorPhone ?? "—"})`
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Emergency Contacts
          </h3>
          {applicant.emergencyContacts &&
          applicant.emergencyContacts.length > 0 ? (
            <ul className="space-y-2">
              {applicant.emergencyContacts.map((c, i) => (
                <li key={i} className="rounded-md bg-muted px-3 py-2 text-sm">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-muted-foreground">
                    {c.relationship} — {c.phone}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No emergency contacts
            </p>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Siblings
          </h3>
          <p className="text-sm">
            {applicant.siblingsEnrolled
              ? "Has siblings enrolled"
              : "No siblings enrolled"}
          </p>
          {applicant.siblingDetails && (
            <p className="mt-1 text-sm text-muted-foreground">
              {applicant.siblingDetails}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
