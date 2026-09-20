import { saveAs } from "file-saver"; 

export const DEFAULT_EXPORT_COLUMNS = [
  "Name",
  "Email",
  "Status",
  "Grade",
  "Major",
  "Gender",
];

export type ExportApplicant = {
  name: string | null;
  email: string | null;
  status: string | null;
  data?: Record<string, unknown>;
};

const normalizeColumn = (column: string) => column.trim().toLowerCase();

const DEFAULT_DATA_COLUMNS = new Set(["grade", "major", "gender"]);

const getColumnWords = (column: string) =>
  normalizeColumn(column).split(/[^a-z0-9]+/).filter(Boolean);

const matchesColumn = (field: string, column: string): boolean => {
  const normalizedField = normalizeColumn(field);
  const normalizedColumn = normalizeColumn(column);

  if (normalizedField === normalizedColumn) return true;
  if (!DEFAULT_DATA_COLUMNS.has(normalizedColumn)) return false;

  const fieldWords = getColumnWords(field);
  return (
    fieldWords.includes(normalizedColumn) ||
    (normalizedColumn === "major" && fieldWords.includes("majors"))
  );
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getApplicantValue = (
  applicant: ExportApplicant,
  column: string,
): string => {
  const normalizedColumn = normalizeColumn(column);

  if (normalizedColumn === "name") return applicant.name ?? "";
  if (normalizedColumn === "email") return applicant.email ?? "";
  if (normalizedColumn === "status") return applicant.status ?? "";

  const fields = Object.entries(applicant.data ?? {});
  const matchingField =
    fields.find(([field]) => normalizeColumn(field) === normalizedColumn) ??
    fields.find(([field]) => matchesColumn(field, column));
  return formatValue(matchingField?.[1]);
};

export const getAvailableExportColumns = (
  applicants: ExportApplicant[],
): string[] => {
  const columns = [...DEFAULT_EXPORT_COLUMNS];
  const seen = new Set(columns.map(normalizeColumn));

  for (const applicant of applicants) {
    for (const field of Object.keys(applicant.data ?? {})) {
      const normalizedField = normalizeColumn(field);
      const matchesDefault = DEFAULT_EXPORT_COLUMNS.some((column) =>
        matchesColumn(field, column),
      );
      if (!normalizedField || seen.has(normalizedField) || matchesDefault) continue;
      seen.add(normalizedField);
      columns.push(field);
    }
  }

  return columns;
};

export const buildCSV = (
  applicants: ExportApplicant[],
  columns: string[],
): string => [
    columns,
    ...applicants.map((applicant) =>
      columns.map((column) => getApplicantValue(applicant, column)),
    ),
  ]
    .map((row) =>
      row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

export const exportToCSV = (
  applicants: ExportApplicant[],
  roundName: string | undefined,
  columns: string[],
) => {
  const csvContent = buildCSV(applicants, columns);
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${roundName} applicants_decisions.csv`);

};
