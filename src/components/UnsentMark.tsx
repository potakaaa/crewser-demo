import { Icon } from './Icon';

/** The one marker for hours not sent yet, wherever they show: calendar days, the day's chip, the hours nudge. */
export function UnsentMark() {
  return (
    <span className="unsent-mark" aria-hidden="true">
      <Icon name="upload" size={12} color="currentColor" strokeWidth={2.2} />
    </span>
  );
}
