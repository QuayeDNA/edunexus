"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, Copy, Check } from "lucide-react";

export function ApplicationUrlCard({
  url,
  schoolName,
}: {
  url: string;
  schoolName: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById(
        "application-url-input",
      ) as HTMLInputElement;
      input?.select();
      document.execCommand("copy");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="rounded-xl bg-green-50 p-3">
          <Link className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <CardTitle className="text-sm font-medium text-text-secondary">
            Application Portal
          </CardTitle>
          <CardDescription>
            Share this link with parents to apply online
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Input
            id="application-url-input"
            value={url}
            readOnly
            className="font-mono text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={copyUrl}
            title="Copy URL"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Parents will apply to <strong>{schoolName}</strong> at this URL.
        </p>
      </CardContent>
    </Card>
  );
}
