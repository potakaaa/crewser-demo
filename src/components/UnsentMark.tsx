import { Icon } from './Icon';

/**
 * The one marker for hours not sent yet, wherever they show: calendar days, the day's chip, the hours nudge.
 * A clock reads as "hours". Hidden from screen readers: the day's label and the chips' text already say "hours not sent".
 */
export function UnsentMark() {
  return (
    <span className="unsent-mark" aria-hidden="true" title="Hours not sent">
      <Icon name="hoursOpen" size={12} color="currentColor" strokeWidth={2.2} />
    </span>
  );
}
