"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/utils/constants";

const STEPS = [
  "School Details",
  "Admin Account",
  "Curriculum Setup",
  "Academic Year",
  "Confirmation",
];

export default function RegisterPage() {
  const [currentStep] = useState(0);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Register {APP_NAME}</CardTitle>
        <CardDescription>Set up your school in 5 easy steps</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                  index < currentStep
                    ? "bg-brand-600 text-white"
                    : index === currentStep
                      ? "border-2 border-brand-600 text-brand-600"
                      : "border border-border text-text-muted"
                }`}
              >
                {index < currentStep ? "✓" : index + 1}
              </div>
              <span
                className={`text-sm ${
                  index <= currentStep ? "text-text-primary" : "text-text-muted"
                }`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-surface-muted p-6 text-center">
          <p className="text-sm text-text-secondary">
            School registration will be available in Phase 2.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Contact your administrator to get started.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
