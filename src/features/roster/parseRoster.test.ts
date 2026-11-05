import { describe, expect, it } from 'vitest';
import { parseRoster } from './parseRoster';

describe('parseRoster', () => {
  it('parses a standard Name + Matric No table with a title banner above the header', () => {
    const res = parseRoster([
      ['300L Computer Science — Class List'],
      ['S/N', 'Full Name', 'Matric Number', 'Phone'],
      [1, '  OKAFOR   Chinedu ', 'csc/2021/001', '0801'],
      [2, 'Bello Amina', 'CSC / 2021 / 002', '0802'],
    ]);
    expect(res.issues).toEqual([]);
    expect(res.entries).toEqual([
      { full_name: 'OKAFOR Chinedu', matric_no: 'CSC/2021/001' },
      { full_name: 'Bello Amina', matric_no: 'CSC/2021/002' },
    ]);
  });

  it('joins separate Surname / First Name / Other Names columns', () => {
    const res = parseRoster([
      ['Reg. No.', 'Surname', 'First Name', 'Other Names'],
      ['21/009', 'Adeyemi', 'Tunde', 'Segun'],
    ]);
    expect(res.entries).toEqual([{ full_name: 'Adeyemi Tunde Segun', matric_no: '21/009' }]);
  });

  it('guesses columns when there is no header row', () => {
    const res = parseRoster([
      ['ENG/22/10', 'Eze Ngozi'],
      ['ENG/22/11', 'Musa Ibrahim'],
    ]);
    expect(res.entries).toHaveLength(2);
    expect(res.entries[0]).toEqual({ full_name: 'Eze Ngozi', matric_no: 'ENG/22/10' });
  });

  it('reports duplicate matric numbers and missing fields with row numbers', () => {
    const res = parseRoster([
      ['Name', 'Matric No'],
      ['Ada Obi', 'CSC/01'],
      ['Ada Obi Again', 'csc/01'],
      ['No Matric', ''],
    ]);
    expect(res.entries).toEqual([{ full_name: 'Ada Obi', matric_no: 'CSC/01' }]);
    expect(res.issues.map((i) => i.row)).toEqual([3, 4]);
  });
});
