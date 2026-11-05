import { supabase } from './db';
import { check, unwrap } from '@/lib/errors';
import type { ClassRoom } from '@/types';

export async function listClasses(): Promise<ClassRoom[]> {
  return unwrap(await supabase.from('classes').select('*').order('created_at', { ascending: false }));
}

export async function getClass(id: string): Promise<ClassRoom> {
  return unwrap(await supabase.from('classes').select('*').eq('id', id).single());
}

export async function createClass(name: string, semesterStart: string | null): Promise<ClassRoom> {
  return unwrap(
    await supabase
      .from('classes')
      .insert({ name: name.trim(), semester_start: semesterStart || null })
      .select()
      .single(),
  );
}

export async function updateClass(
  id: string,
  patch: Partial<Pick<ClassRoom, 'name' | 'semester_start'>>,
): Promise<ClassRoom> {
  return unwrap(await supabase.from('classes').update(patch).eq('id', id).select().single());
}

export async function deleteClass(id: string): Promise<void> {
  check(await supabase.from('classes').delete().eq('id', id));
}

export function joinLink(code: string): string {
  return `${window.location.origin}/join/${code}`;
}
