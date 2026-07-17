export interface CsvRow {
  index: number;
  cells: string[];
}

export interface CsvParseResult {
  headers: string[];
  rows: CsvRow[];
  totalRows: number;
}

export type KnownField =
  | "firstName"
  | "lastName"
  | "gender"
  | "dateOfBirth"
  | "classId"
  | "guardianName"
  | "guardianPhone";

export interface ColumnMap {
  mappings: Record<KnownField, string | null>;
  unmatched: Array<{ header: string; index: number }>;
  matchScores: Record<string, number>;
}

export const KNOWN_FIELD_LABELS: Record<KnownField, string[]> = {
  firstName: [
    "first name",
    "firstname",
    "first_name",
    "given name",
    "givenname",
    "given_name",
    "fname",
    "forename",
  ],
  lastName: [
    "last name",
    "lastname",
    "last_name",
    "surname",
    "family name",
    "family_name",
    "lname",
  ],
  gender: ["gender", "sex"],
  dateOfBirth: [
    "date of birth",
    "dob",
    "birth date",
    "birthdate",
    "birth_date",
    "dateofbirth",
  ],
  classId: [
    "class",
    "class id",
    "classid",
    "class_id",
    "class code",
    "classcode",
    "section",
  ],
  guardianName: [
    "guardian name",
    "guardianname",
    "guardian_name",
    "parent name",
    "parentname",
    "parent_name",
    "parent/guardian",
  ],
  guardianPhone: [
    "guardian phone",
    "guardianphone",
    "guardian_phone",
    "parent phone",
    "parentphone",
    "parent_phone",
    "phone",
    "mobile",
    "telephone",
    "contact",
  ],
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev: number[] = [];
  let curr: number[] = [];
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function parseCsv(csvText: string): CsvParseResult {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let i = 0;

  while (i < csvText.length) {
    const ch = csvText[i];

    if (ch === '"') {
      i++;
      while (i < csvText.length) {
        if (csvText[i] === '"') {
          if (i + 1 < csvText.length && csvText[i + 1] === '"') {
            currentField += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else if (csvText[i] === "\r") {
          currentField += "\n";
          i++;
          if (i < csvText.length && csvText[i] === "\n") i++;
        } else if (csvText[i] === "\n") {
          currentField += "\n";
          i++;
        } else {
          currentField += csvText[i];
          i++;
        }
      }
    } else if (ch === ",") {
      currentRow.push(currentField);
      currentField = "";
      i++;
    } else if (ch === "\r") {
      currentRow.push(currentField);
      currentField = "";
      rows.push(currentRow);
      currentRow = [];
      i++;
      if (i < csvText.length && csvText[i] === "\n") i++;
    } else if (ch === "\n") {
      currentRow.push(currentField);
      currentField = "";
      rows.push(currentRow);
      currentRow = [];
      i++;
    } else {
      currentField += ch;
      i++;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  while (
    rows.length > 0 &&
    rows[rows.length - 1].every((c) => c.trim() === "")
  ) {
    rows.pop();
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1).map((cells, idx) => ({
    index: idx + 2,
    cells,
  }));

  return {
    headers,
    rows: dataRows,
    totalRows: rows.length,
  };
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, " ");
}

function scoreMatch(header: string, label: string): number {
  const h = normalizeHeader(header);
  const l = normalizeHeader(label);

  if (h === l) return 1.0;
  if (l.startsWith(h) || h.startsWith(l)) return 0.9;
  if (l.includes(h) || h.includes(l)) return 0.7;
  if (levenshtein(h, l) <= 2) return 0.6;

  return 0;
}

export function autoMapColumns(headers: string[]): ColumnMap {
  const knownFields = Object.keys(KNOWN_FIELD_LABELS) as KnownField[];

  const mapping: Record<KnownField, string | null> = {} as Record<
    KnownField,
    string | null
  >;
  for (const f of knownFields) mapping[f] = null;

  const usedFields = new Set<KnownField>();
  const matchScores: Record<string, number> = {};
  const unmatched: Array<{ header: string; index: number }> = [];

  interface HeaderScore {
    headerIndex: number;
    header: string;
    knownField: KnownField;
    score: number;
  }

  const allScores: HeaderScore[] = [];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    let bestScore = 0;
    let bestField: KnownField | null = null;

    for (const field of knownFields) {
      for (const label of KNOWN_FIELD_LABELS[field]) {
        const score = scoreMatch(header, label);
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      }
    }

    if (bestField && bestScore >= 0.5) {
      allScores.push({
        headerIndex: i,
        header,
        knownField: bestField,
        score: bestScore,
      });
    }

    matchScores[header] = bestScore;
  }

  allScores.sort((a, b) => b.score - a.score);

  for (const candidate of allScores) {
    if (
      !usedFields.has(candidate.knownField) &&
      mapping[candidate.knownField] === null
    ) {
      mapping[candidate.knownField] = candidate.header;
      usedFields.add(candidate.knownField);
    }
  }

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const isMapped = Object.values(mapping).includes(header);
    if (!isMapped || matchScores[header] < 0.5) {
      unmatched.push({ header, index: i });
    }
  }

  return { mappings: mapping, unmatched, matchScores };
}
