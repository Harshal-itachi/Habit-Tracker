import { DateTime } from "luxon";

export function isValidTimezone(timezone) {
  if (!timezone || typeof timezone !== "string") {
    return false;
  }

  const dateTime = DateTime.now().setZone(timezone);

  return dateTime.isValid;
}

export function getTodayInTimezone(timezone) {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  return DateTime.now()
    .setZone(timezone)
    .toISODate();
}

export function getCurrentDateTimeInTimezone(timezone) {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  return DateTime.now().setZone(timezone);
}

export function isFutureLocalDate(date, timezone) {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const requestedDate = DateTime.fromISO(date, {
    zone: timezone,
  });

  if (!requestedDate.isValid) {
    return false;
  }

  const today = DateTime.now().setZone(timezone).startOf("day");

  return requestedDate.startOf("day") > today;
}

export function isValidLocalDate(date, timezone) {
  if (!isValidTimezone(timezone)) {
    return false;
  }

  const parsed = DateTime.fromISO(date, {
    zone: timezone,
  });

  if (!parsed.isValid) {
    return false;
  }

  return parsed.toISODate() === date;
}