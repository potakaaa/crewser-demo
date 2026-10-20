import { crew, person } from '../mock';
import type { CrewMember, Note } from '../mock';

/** Everyone a note is shared with, you first, then in roster order. */
export function noteCrew(n: Note): CrewMember[] {
  const members = n.crew === 'all' ? crew : crew.filter((c) => n.crew.includes(c.id));
  return [...members.filter((c) => c.id === person.id), ...members.filter((c) => c.id !== person.id)];
}

/** "Whole crew · 20" · "You + 8 others" · "3 crew members" */
export function crewLabel(n: Note): string {
  if (n.crew === 'all') return `Whole crew · ${crew.length}`;
  const members = noteCrew(n);
  const withYou = members.some((c) => c.id === person.id);
  if (!withYou) return `${members.length} crew member${members.length === 1 ? '' : 's'}`;
  return members.length === 1 ? 'Only you' : `You + ${members.length - 1} other${members.length === 2 ? '' : 's'}`;
}

/** Members grouped by department, in the order departments appear on the roster. */
export function byDepartment(members: CrewMember[]): { department: string; members: CrewMember[] }[] {
  const order = [...new Set(crew.map((c) => c.department))];
  return order
    .map((department) => ({ department, members: members.filter((m) => m.department === department) }))
    .filter((g) => g.members.length > 0);
}
