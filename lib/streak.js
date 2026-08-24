import { DateTime } from "luxon";

/**
 * Normalize a YYYY-MM-DD date.
 *
 * We keep dates as calendar dates rather than JavaScript Date objects
 * because streaks are based on local days.
 */
function normalizeDate(date) {
  return DateTime.fromISO(date, {
    zone: "UTC",
  }).startOf("day");
}

/**
 * Check whether two local dates are consecutive days.
 */
function areConsecutiveDays(previousDate, currentDate) {
  const previous = normalizeDate(previousDate);
  const current = normalizeDate(currentDate);

  return current.diff(previous, "days").days === 1;
}

/**
 * Calculate the longest consecutive streak.
 *
 * @param {string[]} dates
 * @returns {number}
 */
export function calculateLongestStreak(dates) {
  if (!dates || dates.length === 0) {
    return 0;
  }

  const uniqueDates = [...new Set(dates)];

  const sortedDates = uniqueDates.sort((a, b) => {
    return normalizeDate(a).toMillis() - normalizeDate(b).toMillis();
  });

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    if (
      areConsecutiveDays(
        sortedDates[i - 1],
        sortedDates[i]
      )
    ) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    longestStreak = Math.max(
      longestStreak,
      currentStreak
    );
  }

  return longestStreak;
}

/**
 * Calculate the current streak.
 *
 * Current streak is calculated from today backwards.
 *
 * Example:
 *
 * Today      ✓
 * Yesterday  ✓
 * -2 days    ✓
 * -3 days    ✗
 *
 * Current streak = 3
 */
export function calculateCurrentStreak(
  dates,
  today
) {
  if (!dates || dates.length === 0) {
    return 0;
  }

  const uniqueDates = new Set(dates);

  let currentDate = normalizeDate(today);

  /*
   * If today is not checked in, there is no active
   * streak ending today.
   */
  if (!uniqueDates.has(currentDate.toISODate())) {
    return 0;
  }

  let streak = 0;

  while (true) {
    const dateString = currentDate.toISODate();

    if (!uniqueDates.has(dateString)) {
      break;
    }

    streak += 1;

    currentDate = currentDate.minus({
      days: 1,
    });
  }

  return streak;
}

/**
 * Calculate both current and longest streak.
 */
export function calculateStreaks(
  dates,
  today
) {
  return {
    currentStreak: calculateCurrentStreak(
      dates,
      today
    ),

    longestStreak: calculateLongestStreak(
      dates
    ),
  };
}