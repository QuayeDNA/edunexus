export const ATTENDANCE_LOCK_WINDOW_HOURS = 48;

export const isAttendanceDateLocked = (dateValue, nowDate = new Date()) => {
  if (!dateValue) return false;

  const targetDate = new Date(`${dateValue}T23:59:59`);
  if (Number.isNaN(targetDate.getTime())) return false;

  const windowMs = ATTENDANCE_LOCK_WINDOW_HOURS * 60 * 60 * 1000;
  return nowDate.getTime() - targetDate.getTime() > windowMs;
};
