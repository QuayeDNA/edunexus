import type {
  ApplicantListItem,
  ApplicantStats,
  ConversionResult,
} from "@/types/applicant";

export interface ApplicantListParams {
  status?: string | null;
  gradeLevelId?: string;
  search?: string;
  page: number;
  pageSize?: number;
}

export interface ApplicantListResponse {
  data: ApplicantListItem[];
  pagination: { total: number; totalPages: number };
}

export async function fetchApplicants(
  params: ApplicantListParams,
): Promise<ApplicantListResponse> {
  const url = new URLSearchParams();
  if (params.status) url.set("status", params.status);
  if (params.gradeLevelId) url.set("gradeLevelId", params.gradeLevelId);
  if (params.search) url.set("search", params.search);
  url.set("page", String(params.page));
  url.set("pageSize", String(params.pageSize ?? 20));

  const res = await fetch(`/api/applicants?${url}`);
  if (!res.ok) throw new Error("Failed to fetch applicants");
  return res.json();
}

export async function fetchApplicantStats(): Promise<{ data: ApplicantStats }> {
  const res = await fetch("/api/applicants/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function acceptApplicant(
  applicantId: string,
  targetClassId: string,
  override?: boolean,
): Promise<ConversionResult> {
  const res = await fetch(`/api/applicants/${applicantId}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetClassId, override }),
  });
  const body = await res.json();
  if (res.status === 409) throw new CapacityExceededError(body.error);
  if (!res.ok) throw new Error(body.error ?? "Failed to accept applicant");
  return body.data;
}

export class CapacityExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapacityExceededError";
  }
}
