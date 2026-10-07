export type ActivityStatus = 'active' | 'reminder' | 'hidden' | 'paused' | 'suspended';

export interface ActivityInput {
  lastActiveAt: Date;
  openReports: number;
}

const DAY = 24 * 60 * 60 * 1000;
const REPORTS_TO_SUSPEND = 3;

export function activityStatus({ lastActiveAt, openReports }: ActivityInput, now: Date): ActivityStatus {
  if (openReports >= REPORTS_TO_SUSPEND) return 'suspended';
  const days = (now.getTime() - lastActiveAt.getTime()) / DAY;
  if (days > 14) return 'paused';
  if (days > 7) return 'hidden';
  if (days > 3) return 'reminder';
  return 'active';
}
