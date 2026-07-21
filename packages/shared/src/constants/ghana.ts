export const GHANA_TERMS = [
  { term_number: 1, name: "First Term", start_month: 9, end_month: 12 },
  { term_number: 2, name: "Second Term", start_month: 1, end_month: 4 },
  { term_number: 3, name: "Third Term", start_month: 4, end_month: 7 },
] as const;

export const GHANA_GRADE_LEVELS = [
  {
    code: "CR",
    name: "Crèche",
    level: 0,
    category: "creche" as const,
    sort_order: 0,
  },
  {
    code: "N1",
    name: "Nursery 1",
    level: 1,
    category: "nursery" as const,
    sort_order: 1,
  },
  {
    code: "N2",
    name: "Nursery 2",
    level: 2,
    category: "nursery" as const,
    sort_order: 2,
  },
  {
    code: "KG1",
    name: "Kindergarten 1",
    level: 3,
    category: "kindergarten" as const,
    sort_order: 3,
  },
  {
    code: "KG2",
    name: "Kindergarten 2",
    level: 4,
    category: "kindergarten" as const,
    sort_order: 4,
  },
  {
    code: "P1",
    name: "Primary 1",
    level: 5,
    category: "primary" as const,
    sort_order: 5,
  },
  {
    code: "P2",
    name: "Primary 2",
    level: 6,
    category: "primary" as const,
    sort_order: 6,
  },
  {
    code: "P3",
    name: "Primary 3",
    level: 7,
    category: "primary" as const,
    sort_order: 7,
  },
  {
    code: "P4",
    name: "Primary 4",
    level: 8,
    category: "primary" as const,
    sort_order: 8,
  },
  {
    code: "P5",
    name: "Primary 5",
    level: 9,
    category: "primary" as const,
    sort_order: 9,
  },
  {
    code: "P6",
    name: "Primary 6",
    level: 10,
    category: "primary" as const,
    sort_order: 10,
  },
  {
    code: "JHS1",
    name: "JHS 1",
    level: 11,
    category: "junior_secondary" as const,
    sort_order: 11,
  },
  {
    code: "JHS2",
    name: "JHS 2",
    level: 12,
    category: "junior_secondary" as const,
    sort_order: 12,
  },
  {
    code: "JHS3",
    name: "JHS 3",
    level: 13,
    category: "junior_secondary" as const,
    sort_order: 13,
  },
] as const;

export const MOMO_PROVIDERS = [
  {
    id: "mtn",
    name: "MTN Mobile Money",
    prefix: "024",
    code: "MTN",
    regex: /^(024|054|055|059)/,
  },
  {
    id: "vodafone",
    name: "Vodafone Cash",
    prefix: "020",
    code: "VOD",
    regex: /^(020|050)/,
  },
  {
    id: "airteltigo",
    name: "AirtelTigo Money",
    prefix: "027",
    code: "TGO",
    regex: /^(027|026|056)/,
  },
] as const;

export function detectMomoProvider(phone: string): string | null {
  const provider = MOMO_PROVIDERS.find((p) => p.regex.test(phone));
  return provider?.id ?? null;
}

export const GHANA_REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono East",
  "Brong-Ahafo",
  "Central",
  "Eastern",
  "Greater Accra",
  "Northern",
  "North East",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
] as const;

export const CURRENCY = {
  code: "GHS",
  symbol: "₵",
  name: "Ghana Cedi",
  locale: "en-GH",
} as const;
