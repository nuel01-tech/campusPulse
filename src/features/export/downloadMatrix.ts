import type { AttendanceMatrix } from './buildMatrix';

export type ExportFormat = 'xlsx' | 'csv';

function safeFileName(s: string): string {
  return s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'attendance';
}

/** Downloads the matrix as an Excel workbook or CSV file. */
export async function downloadMatrix(matrix: AttendanceMatrix, title: string, format: ExportFormat): Promise<void> {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([matrix.header, ...matrix.rows]);

  // Reasonable column widths: S/N, Name, Matric, weeks..., totals.
  sheet['!cols'] = matrix.header.map((h, i) => ({ wch: i === 1 ? 32 : i === 2 ? 16 : Math.max(6, h.length + 1) }));
  sheet['!freeze'] = { xSplit: 3, ySplit: 1 };

  const name = safeFileName(title);
  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    // BOM so Excel opens UTF-8 names correctly.
    triggerDownload(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), `${name}.csv`);
    return;
  }

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Attendance');
  XLSX.writeFile(book, `${name}.xlsx`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
