import { useActiveLink } from '../store';

/** Screen-reader only: on a colleague's link, says whose hours this app is entering. Nothing on your own link. */
export function ForColleague() {
  const link = useActiveLink();
  if (link.isMe) return null;
  return <p className="sr-only">Entering hours for {link.personName}, {link.position}.</p>;
}
