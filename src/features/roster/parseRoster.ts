/**
 * Turns raw spreadsheet rows into roster entries.
 *
 * Accepts the shapes class reps actually have:
 *   - "Name" + "Matric No"
 *   - "Surname" + "First Name" (+ "Other Names") + "Reg No"
 *   - no header row at all, two columns in either order
 * Extra columns (S/N, phone, email...) are ignored.
 */
import { normalizeMatric, normalizeName } from '@/lib/names';
import type { RosterEntry } from '@/types';

export type Cell = string | number | boolean | null | undefined;

export interface RosterIssue {
  row: number; // 1-based row number as seen in the spreadsheet
  message: string;
}

export interface ParsedRoster {
  entries: RosterEntry[];
  issues: RosterIssue[];
}

interface ColumnMap {
  matric: number;
  fullName?: number;
  surname?: number;
  firstNames: number[]; // first name, middle, other names — joined in order
}

const MATRIC_HEADER = /matric|reg(istration)?\.?\s*(no|num|number)?|student\s*(id|no)|admission\s*(no|number)/i;
const FULL_NAME_HEADER = /^(student'?s?\s*)?(full\s*)?names?$|^name\s*of\s*student$/i;
const SURNAME_HEADER = /surname|last\s*name|family\s*name/i;
const FIRST_NAME_HEADER = /first\s*name|given\s*name|other\s*names?|middle\s*name|forename/i;

const text = (c: Cell): string => (c === null || c === undefined ? '' : String(c)).trim();

/** Looks like a matric/reg number: has a digit and no spaces between words. */
const looksLikeMatric = (v: string) => /\d/.test(v) && /^[A-Za-z0-9/\-._ ]{2,40}$/.test(v);

function detectHeader(rows: Cell[][]): { index: number; map: ColumnMap } | null {
  const scan = Math.min(rows.length, 10);
  for (let r = 0; r < scan; r++) {
    const cells = (rows[r] ?? []).map(text);
    const matric = cells.findIndex((c) => MATRIC_HEADER.test(c));
    if (matric === -1) continue;

    const fullName = cells.findIndex((c, i) => i !== matric && FULL_NAME_HEADER.test(c));
    const surname = cells.findIndex((c, i) => i !== matric && SURNAME_HEADER.test(c));
    const firstNames = cells
      .map((c, i) => (i !== matric && FIRST_NAME_HEADER.test(c) ? i : -1))
      .filter((i) => i !== -1);

    if (fullName !== -1) return { index: r, map: { matric, fullName, firstNames: [] } };
    if (surname !== -1 || firstNames.length) {
      return { index: r, map: { matric, surname: surname === -1 ? undefined : surname, firstNames } };
    }
  }
  return null;
}

/** No header: pick the column that mostly looks like matric numbers. */
function guessColumns(rows: Cell[][]): ColumnMap | null {
  const sample = rows.slice(0, 20).filter((r) => r.some((c) => text(c)));
  const width = Math.max(0, ...sample.map((r) => r.length));
  if (width < 2) return null;

  const score = (col: number, test: (v: string) => boolean) =>
    sample.filter((r) => test(text(r[col]))).length / Math.max(1, sample.length);

  let matric = -1;
  let name = -1;
  for (let c = 0; c < width; c++) {
    if (matric === -1 && score(c, looksLikeMatric) > 0.6) matric = c;
  }
  for (let c = 0; c < width; c++) {
    if (c !== matric && name === -1 && score(c, (v) => /[a-z]{2,}.*\s+.*[a-z]{2,}/i.test(v) && !/\d/.test(v)) > 0.6) {
      name = c;
    }
  }
  return matric !== -1 && name !== -1 ? { matric, fullName: name, firstNames: [] } : null;
}

function nameFrom(row: Cell[], map: ColumnMap): string {
  if (map.fullName !== undefined) return normalizeName(text(row[map.fullName]));
  const parts = [map.surname !== undefined ? text(row[map.surname]) : '', ...map.firstNames.map((i) => text(row[i]))];
  return normalizeName(parts.filter(Boolean).join(' '));
}

export function parseRoster(rows: Cell[][]): ParsedRoster {
  const issues: RosterIssue[] = [];
  const header = detectHeader(rows);
  const map = header?.map ?? guessColumns(rows);

  if (!map) {
    return {
      entries: [],
      issues: [
        {
          row: 0,
          message:
            'Could not find the name and matric number columns. Add a header row with "Name" and "Matric No".',
        },
      ],
    };
  }

  const start = header ? header.index + 1 : 0;
  const seen = new Map<string, number>();
  const entries: RosterEntry[] = [];

  for (let r = start; r < rows.length; r++) {
    const row = rows[r] ?? [];
    if (!row.some((c) => text(c))) continue; // blank line

    const rowNo = r + 1;
    const full_name = nameFrom(row, map);
    const matric_no = normalizeMatric(text(row[map.matric]));

    if (!matric_no && !full_name) continue;
    if (!matric_no) {
      issues.push({ row: rowNo, message: `${full_name}: missing matric number` });
      continue;
    }
    if (!full_name || full_name.length < 2) {
      issues.push({ row: rowNo, message: `${matric_no}: missing name` });
      continue;
    }
    if (matric_no.length > 40) {
      issues.push({ row: rowNo, message: `${matric_no.slice(0, 20)}…: matric number is too long` });
      continue;
    }
    const firstRow = seen.get(matric_no);
    if (firstRow !== undefined) {
      issues.push({ row: rowNo, message: `${matric_no}: duplicate of row ${firstRow}, skipped` });
      continue;
    }

    seen.set(matric_no, rowNo);
    entries.push({ full_name, matric_no });
  }

  if (!entries.length && !issues.length) {
    issues.push({ row: 0, message: 'The file has no student rows.' });
  }

  return { entries, issues };
}
