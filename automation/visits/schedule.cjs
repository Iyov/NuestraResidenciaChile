const VISIT_SCHEDULE_DEFAULTS = Object.freeze({
  timeZone: 'America/Santiago',
  windows: Object.freeze([
    Object.freeze({ start: '10:00', end: '11:30' }),
    Object.freeze({ start: '14:00', end: '16:00' }),
  ]),
  // Francisco, 2026-10-08: a visit takes about 30 minutes and a full hour is reserved.
  reservedMinutes: 60,
  // The windows bound the start time; Nico and Frank decide whether they can
  // take it. With true, the reserved time has to end inside the window.
  fitWholeVisit: false,
  searchDays: 60,
});

const REJECTIONS = Object.freeze({
  invalid: 'fecha u hora inválida',
  past: 'fecha pasada',
  weekend: 'fin de semana',
  holiday: 'festivo',
  holidaysUnverified: 'festivos no verificables',
  outsideWindows: 'fuera de horario',
});

/**
 * Holidays come from outside (see holidays.cjs). A year without a list is
 * unverifiable, not holiday-free.
 */
function createHolidayCalendar(datesByYear) {
  const years = new Map();
  for (const [year, dates] of Object.entries(datesByYear || {})) {
    for (const date of dates) {
      if (!parseDate(date) || !date.startsWith(`${year}-`)) throw new Error('Invalid holiday date.');
    }
    years.set(Number(year), new Set(dates));
  }
  return {
    coversYear: (year) => years.has(year),
    isHoliday: (date) => years.get(Number(date.slice(0, 4))).has(date),
  };
}

/**
 * Visit hours of SPEC-003. Dates and times are Santiago wall-clock strings
 * ('2026-10-13', '10:30'), so nothing here depends on the machine's time zone.
 * No host answer can widen these rules: there is no override parameter.
 */
function createVisitSchedule(holidays, options) {
  const config = Object.assign({}, VISIT_SCHEDULE_DEFAULTS, options);
  const calendar = holidays || createHolidayCalendar();
  const windows = config.windows.map((window) => {
    const start = parseTime(window.start);
    const lastStart = parseTime(window.end) - (config.fitWholeVisit ? config.reservedMinutes : 0);
    if (start === null || !(lastStart >= start)) throw new Error('Invalid visit window.');
    return { start: window.start, end: window.end, startMinutes: start, lastStartMinutes: lastStart };
  });

  function checkDay(date) {
    const day = parseDate(date);
    if (!day) return REJECTIONS.invalid;
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) return REJECTIONS.weekend;
    if (!calendar.coversYear(day.getUTCFullYear())) return REJECTIONS.holidaysUnverified;
    if (calendar.isHoliday(date)) return REJECTIONS.holiday;
    return null;
  }

  /** `now` is optional; with it, a slot that already passed is rejected. */
  function check(date, time, now) {
    const minutes = parseTime(time);
    if (minutes === null || !parseDate(date)) return reject(REJECTIONS.invalid);
    if (now !== undefined && !isAfter({ date, time }, localDateTime(now, config.timeZone))) {
      return reject(REJECTIONS.past);
    }
    const dayRejection = checkDay(date);
    if (dayRejection) return reject(dayRejection);
    const fits = windows.some((window) => minutes >= window.startMinutes && minutes <= window.lastStartMinutes);
    return fits ? { ok: true } : reject(REJECTIONS.outsideWindows);
  }

  /**
   * Next valid windows that can still start after `after` ({ date, time }).
   * The search stops at a year whose holidays cannot be verified.
   */
  function alternatives(after, count = 3) {
    const found = [];
    if (!after || !parseDate(after.date) || parseTime(after.time) === null) return found;

    let date = after.date;
    for (let offset = 0; offset < config.searchDays && found.length < count; offset += 1) {
      const rejection = checkDay(date);
      if (rejection === REJECTIONS.holidaysUnverified) break;
      if (!rejection) {
        for (const window of windows) {
          const lastStart = { date, time: formatTime(window.lastStartMinutes) };
          if (found.length < count && isAfter(lastStart, after)) {
            found.push({ date, start: window.start, end: window.end });
          }
        }
      }
      date = addDays(date, 1);
    }
    return found;
  }

  return {
    check,
    alternatives,
    reservedMinutes: config.reservedMinutes,
    localNow: (now) => localDateTime(now, config.timeZone),
  };
}

function reject(reason) {
  return { ok: false, reason };
}

function isAfter(left, right) {
  return `${left.date} ${left.time}` > `${right.date} ${right.time}`;
}

function parseDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!match) return null;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return day.toISOString().slice(0, 10) === match[0] ? day : null;
}

function parseTime(time) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function addDays(date, days) {
  const day = parseDate(date);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

function localDateTime(at, timeZone) {
  const parts = {};
  for (const part of new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(at))) {
    parts[part.type] = part.value;
  }
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

module.exports = { REJECTIONS, VISIT_SCHEDULE_DEFAULTS, createHolidayCalendar, createVisitSchedule };
