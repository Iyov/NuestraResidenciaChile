const fs = require('node:fs');
const path = require('node:path');

const { createHolidayCalendar } = require('./schedule.cjs');

// Google's public calendar "Festivos en Chile" (source chosen by Francisco, 2026-10-08).
const GOOGLE_HOLIDAYS_URL =
  'https://calendar.google.com/calendar/ical/es.cl%23holiday%40group.v.calendar.google.com/public/basic.ics';
const SNAPSHOT_PATH = path.join(__dirname, 'holidays-cl.json');

/**
 * Reads the calendar file and keeps only the entries Google labels "Día
 * festivo": Francisco decided on 2026-10-08 that what blocks a visit is the
 * official holiday, so the "Celebración" entries (Jueves Santo, Corpus
 * Christi…) stay working days. A year counts as covered only when it has both
 * 1 January and 25 December, so a year cut off at the edge of the feed stays
 * unverifiable.
 */
function parseGoogleHolidayIcs(text) {
  const lines = String(text).replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const byYear = {};
  let event = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      event = {};
    } else if (line === 'END:VEVENT') {
      if (event && event.start && event.official) {
        for (const date of eventDates(event.start, event.end)) {
          const year = date.slice(0, 4);
          (byYear[year] = byYear[year] || new Set()).add(date);
        }
      }
      event = null;
    } else if (event) {
      const separator = line.indexOf(':');
      const name = line.slice(0, separator).split(';')[0];
      const value = line.slice(separator + 1);
      if (name === 'DTSTART') event.start = toDate(value);
      if (name === 'DTEND') event.end = toDate(value);
      if (name === 'DESCRIPTION') event.official = /^Día festivo/.test(value);
    }
  }

  const years = {};
  for (const year of Object.keys(byYear).sort()) {
    if (byYear[year].has(`${year}-01-01`) && byYear[year].has(`${year}-12-25`)) {
      years[year] = Array.from(byYear[year]).sort();
    }
  }
  return years;
}

/** The end date of a calendar entry is exclusive. */
function eventDates(start, end) {
  const dates = [];
  const day = new Date(`${start}T00:00:00Z`);
  const last = end ? new Date(`${end}T00:00:00Z`) : null;
  do {
    dates.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  } while (last && day < last);
  return dates;
}

function toDate(value) {
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/**
 * Calendar from the snapshot saved next to this file. `extra` holds days added
 * by hand that Google does not publish (elections, closures, bridge days).
 */
function loadHolidayCalendar(snapshotPath = SNAPSHOT_PATH) {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const years = {};
  for (const [year, dates] of Object.entries(snapshot.years)) {
    years[year] = dates.concat((snapshot.extra || []).filter((date) => date.startsWith(`${year}-`)));
  }
  return createHolidayCalendar(years);
}

/** `node automation/visits/holidays.cjs` downloads the calendar again and rewrites the snapshot. */
async function updateSnapshot() {
  const response = await fetch(GOOGLE_HOLIDAYS_URL);
  if (!response.ok) throw new Error(`The holiday calendar answered ${response.status}.`);

  const all = parseGoogleHolidayIcs(await response.text());
  const today = new Date().toISOString().slice(0, 10);
  const years = {};
  for (const year of Object.keys(all)) {
    if (year >= today.slice(0, 4)) years[year] = all[year];
  }
  if (!Object.keys(years).length) throw new Error('The holiday calendar has no complete year.');

  const extra = fs.existsSync(SNAPSHOT_PATH) ? JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')).extra || [] : [];
  const snapshot = { source: GOOGLE_HOLIDAYS_URL, fetchedOn: today, extra, years };
  fs.writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  return snapshot;
}

if (require.main === module) {
  updateSnapshot().then(
    (snapshot) => console.log(`Holidays saved for ${Object.keys(snapshot.years).join(', ')}.`),
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
}

module.exports = { GOOGLE_HOLIDAYS_URL, loadHolidayCalendar, parseGoogleHolidayIcs };
