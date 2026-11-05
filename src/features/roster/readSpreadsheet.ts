/**
 * Reads a .csv / .xlsx / .xls file into rows of cells. SheetJS is loaded on
 * demand so it never weighs down the student pages.
 */
import { AppError } from '@/lib/errors';
import type { Cell } from './parseRoster';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = /\.(csv|xlsx|xls|ods)$/i;

export const ROSTER_ACCEPT = '.csv,.xlsx,.xls,.ods';

export async function readSpreadsheet(file: File): Promise<Cell[][]> {
  if (!ACCEPTED.test(file.name)) {
    throw new AppError('FILE_TYPE', 'Choose a .csv or Excel (.xlsx, .xls) file.');
  }
  if (file.size > MAX_BYTES) {
    throw new AppError('FILE_SIZE', 'That file is larger than 5 MB. Remove extra sheets or columns and try again.');
  }

  const XLSX = await import('xlsx');
  try {
    const buffer = await file.arrayBuffer();
    const book = XLSX.read(buffer, { type: 'array', raw: false });
    const firstSheet = book.SheetNames[0];
    if (!firstSheet) throw new Error('no sheets');
    const sheet = book.Sheets[firstSheet]!;
    return XLSX.utils.sheet_to_json<Cell[]>(sheet, { header: 1, blankrows: false, defval: '', raw: false });
  } catch (e) {
    console.error(e);
    throw new AppError('FILE_READ', 'Could not read that file. Save it again as .csv or .xlsx and retry.');
  }
}
