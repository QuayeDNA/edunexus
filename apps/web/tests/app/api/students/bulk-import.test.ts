import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateStudent = vi.fn().mockResolvedValue({
  student: {
    id: "student-1",
    studentIdNumber: "AABS20260001",
    firstName: "John",
    lastName: "Doe",
  },
  enrollment: { id: "enrollment-1" },
  guardian: { id: "guardian-1" },
  credentials: { student: { email: "s@e.com", password: "pw" } },
});

let mockDbState = { idx: 0, results: [] as any[][] };

function createDbMock() {
  const target: any = () => {};
  const proxy = new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: any) => void) => {
          return resolve(mockDbState.results[mockDbState.idx++] ?? []);
        };
      }
      if (
        typeof prop === "string" &&
        ["select", "from", "where", "orderBy", "limit"].includes(prop)
      ) {
        return () => proxy;
      }
      return undefined;
    },
  });
  return proxy;
}

const mockDb = createDbMock();

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/services/student-creation", () => ({
  createStudentFromData: mockCreateStudent,
}));
vi.mock("@/lib/api/require-role", () => ({
  requireRole: vi
    .fn()
    .mockResolvedValue({ error: null, user: { id: "admin-1", role: "admin" } }),
}));
vi.mock("@/lib/tenant/resolve", () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId: "school-1" }),
}));

describe("POST /api/students/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbState = { idx: 0, results: [] };
  });

  it("preview returns headers and suggested mapping", async () => {
    const { POST } = await import("@/app/api/students/import/preview/route");
    const res = await POST(
      new Request("http://localhost:3000/api/students/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: "firstName,lastName,gender\nJohn,Doe,male",
        }),
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.headers).toContain("firstName");
    expect(body.data.suggestedMapping).toBeDefined();
    expect(body.data.sampleRows).toHaveLength(1);
    expect(body.data.totalRows).toBe(2);
  });

  it("validate returns per-row validation results", async () => {
    const { POST } = await import("@/app/api/students/import/validate/route");
    const res = await POST(
      new Request("http://localhost:3000/api/students/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: "firstName,lastName\nJohn,Doe\n,Smith",
          mapping: { firstName: "firstName", lastName: "lastName" },
        }),
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.total).toBe(2);
    expect(typeof body.data.valid).toBe("number");
    expect(typeof body.data.invalid).toBe("number");
  });

  it("execute imports valid rows and reports failed rows", async () => {
    mockDbState = {
      idx: 0,
      results: [
        [{ id: "year-1", isCurrent: true, schoolId: "school-1" }],
        [
          {
            id: "class-1",
            code: "SS1A",
            name: "SS 1A",
            gradeLevelId: "g-1",
            schoolId: "school-1",
          },
        ],
        [{ id: "school-1", code: "AABS" }],
      ],
    };

    const { POST } = await import("@/app/api/students/import/execute/route");

    const csv = [
      "firstName,lastName,gender,dateOfBirth,classCode,guardianName,guardianPhone",
      "John,Doe,male,2010-01-15,SS1A,Jane Doe,0205516734",
      ",Smith,male,2010-01-15,SS1A,,0205516735",
    ].join("\n");

    const res = await POST(
      new Request("http://localhost:3000/api/students/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json", host: "localhost:3000" },
        body: JSON.stringify({
          csv,
          mapping: {
            firstName: "firstName",
            lastName: "lastName",
            gender: "gender",
            dateOfBirth: "dateOfBirth",
            classCode: "classCode",
            guardianName: "guardianName",
            guardianPhone: "guardianPhone",
          },
        }),
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.failed).toBe(1);
    expect(body.data.total).toBe(2);
    expect(body.data.results[0].status).toBe("imported");
    expect(body.data.results[1].status).toBe("failed");
  });
});
