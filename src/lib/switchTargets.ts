import type { CrewLink } from '../mock';

const usable = (l: CrewLink) => l.status !== 'expired' && l.status !== 'revoked';

/**
 * What the header gestures cycle through, each entry being the link `setActiveLink` takes.
 * people: the usable links in the current project, you first (the avatar swipe).
 * projects: one usable link per project in the phone's order, the current link standing for its own
 * project and otherwise yours before a colleague's (the project-line swipe).
 */
export interface SwitchTargets {
  people: CrewLink[];
  projects: CrewLink[];
}

export function switchTargets(links: CrewLink[], activeId: string): SwitchTargets {
  const active = links.find((l) => l.id === activeId);
  const ok = links.filter(usable);
  const people = ok.filter((l) => l.projectId === active?.projectId).sort((a, b) => Number(b.isMe) - Number(a.isMe));
  const projectIds = [...new Set(ok.map((l) => l.projectId))];
  const projects = projectIds.map((pid) => {
    const inProject = ok.filter((l) => l.projectId === pid);
    return inProject.find((l) => l.id === activeId) ?? inProject.find((l) => l.isMe) ?? inProject[0];
  });
  return { people, projects };
}

/** The entry `step` places away from the one matching `at`, wrapping round; null when there is nowhere to go. */
export function stepTarget(list: CrewLink[], at: (l: CrewLink) => boolean, step: 1 | -1): CrewLink | null {
  if (list.length < 2) return null;
  const i = Math.max(0, list.findIndex(at));
  return list[(i + step + list.length) % list.length];
}
