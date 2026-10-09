const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { loadHolidayCalendar, parseGoogleHolidayIcs } = require('./holidays.cjs');
const { REJECTIONS, createHolidayCalendar, createVisitSchedule } = require('./schedule.cjs');
const {
  DESISTED,
  NRC_ADDRESS,
  VISIT_STATES,
  assignByOwner,
  availabilityButtons,
  availabilityQuestion,
  closeVisit,
  confirmByOwner,
  confirmationDetails,
  expireVisit,
  parseHostButton,
  parseHostReply,
  recordHostReply,
  requestVisit,
} = require('./visit.cjs');

// Synthetic fixtures only. The holiday list is an example, not an official calendar.
const HOLIDAYS = createHolidayCalendar({ 2026: ['2026-10-12'] });
const NOW = '2026-10-08T15:00:00Z'; // Thursday, 12:00 in Santiago
const FRIDAY = '2026-10-09';
const SATURDAY = '2026-10-10';
const HOLIDAY_MONDAY = '2026-10-12';
const TUESDAY = '2026-10-13';

function request(overrides) {
  return Object.assign(
    { visitId: 'V-1', prospectId: 22, date: FRIDAY, time: '10:30', hosts: ['nico', 'frank'] },
    overrides,
  );
}

function pendingVisit(overrides) {
  const result = requestVisit(createVisitSchedule(HOLIDAYS), request(overrides), NOW);
  assert.equal(result.ok, true);
  return result.visit;
}

test('both windows accept their limits and nothing outside them', () => {
  const schedule = createVisitSchedule(HOLIDAYS);
  for (const time of ['10:00', '11:30', '14:00', '16:00']) {
    assert.deepEqual(schedule.check(FRIDAY, time), { ok: true });
  }
  for (const time of ['09:59', '11:31', '13:59', '16:01', '20:00']) {
    assert.deepEqual(schedule.check(FRIDAY, time), { ok: false, reason: REJECTIONS.outsideWindows });
  }
});

test('weekends and holidays are rejected at any hour', () => {
  const schedule = createVisitSchedule(HOLIDAYS);
  assert.equal(schedule.check(SATURDAY, '10:30').reason, REJECTIONS.weekend);
  assert.equal(schedule.check('2026-10-11', '10:30').reason, REJECTIONS.weekend);
  assert.equal(schedule.check(HOLIDAY_MONDAY, '10:30').reason, REJECTIONS.holiday);
});

test('a year without a holiday list is never confirmed', () => {
  assert.equal(createVisitSchedule().check(FRIDAY, '10:30').reason, REJECTIONS.holidaysUnverified);
  assert.equal(createVisitSchedule(HOLIDAYS).check('2027-01-05', '10:30').reason, REJECTIONS.holidaysUnverified);
  assert.deepEqual(createVisitSchedule().alternatives({ date: FRIDAY, time: '10:30' }), []);
});

test('malformed and past slots are rejected', () => {
  const schedule = createVisitSchedule(HOLIDAYS);
  assert.equal(schedule.check('2026-02-30', '10:30').reason, REJECTIONS.invalid);
  assert.equal(schedule.check(FRIDAY, '25:00').reason, REJECTIONS.invalid);
  assert.equal(schedule.check('2026-10-08', '10:30', NOW).reason, REJECTIONS.past);
  assert.deepEqual(schedule.check('2026-10-08', '14:30', NOW), { ok: true });
});

test('the reserved time can be required to end inside the window', () => {
  const schedule = createVisitSchedule(HOLIDAYS, { reservedMinutes: 45, fitWholeVisit: true });
  assert.equal(schedule.check(FRIDAY, '10:45').ok, true);
  assert.equal(schedule.check(FRIDAY, '11:00').reason, REJECTIONS.outsideWindows);
  assert.equal(schedule.check(FRIDAY, '15:15').ok, true);
  assert.equal(schedule.check(FRIDAY, '15:30').reason, REJECTIONS.outsideWindows);
});

test('alternatives skip the weekend and the holiday', () => {
  const schedule = createVisitSchedule(HOLIDAYS);
  assert.deepEqual(schedule.alternatives({ date: FRIDAY, time: '12:00' }), [
    { date: FRIDAY, start: '14:00', end: '16:00' },
    { date: TUESDAY, start: '10:00', end: '11:30' },
    { date: TUESDAY, start: '14:00', end: '16:00' },
  ]);
});

test('an invalid request creates no visit and offers valid options (AC-001, AC-006)', () => {
  const schedule = createVisitSchedule(HOLIDAYS);
  const weekend = requestVisit(schedule, request({ date: SATURDAY }), NOW);
  assert.equal(weekend.ok, false);
  assert.equal(weekend.visit, undefined);
  assert.equal(weekend.reason, REJECTIONS.weekend);
  assert.deepEqual(weekend.alternatives[0], { date: TUESDAY, start: '10:00', end: '11:30' });

  const late = requestVisit(schedule, request({ time: '18:00' }), NOW);
  assert.equal(late.reason, REJECTIONS.outsideWindows);
  assert.deepEqual(late.alternatives[0], { date: TUESDAY, start: '10:00', end: '11:30' });

  const past = requestVisit(schedule, request({ date: '2026-10-01' }), NOW);
  assert.equal(past.reason, REJECTIONS.past);
  assert.deepEqual(past.alternatives[0], { date: '2026-10-08', start: '14:00', end: '16:00' });
});

test('a prospect who desisted only gets a visit on their own request (AC-007)', () => {
  const schedule = createVisitSchedule(HOLIDAYS);
  const refused = requestVisit(schedule, request({ prospectDesisted: true }), NOW);
  assert.deepEqual(refused, { ok: false, reason: DESISTED, alternatives: [] });
  assert.equal(requestVisit(schedule, request({ prospectDesisted: true, prospectAsked: true }), NOW).ok, true);
});

test('the first yes assigns exactly one host (AC-002)', () => {
  let visit = pendingVisit();
  visit = recordHostReply(visit, { host: 'frank', accepts: true, at: '2026-10-08T15:05:00Z' });
  assert.equal(visit.state, VISIT_STATES.assigned);
  assert.equal(visit.host, 'frank');

  visit = recordHostReply(visit, { host: 'nico', accepts: true, at: '2026-10-08T15:09:00Z' });
  assert.equal(visit.state, VISIT_STATES.assigned);
  assert.equal(visit.host, 'frank');
});

test('a yes after a no still assigns, and strangers are ignored', () => {
  let visit = pendingVisit();
  visit = recordHostReply(visit, { host: 'nico', accepts: false, at: '2026-10-08T15:05:00Z' });
  assert.equal(visit.state, VISIT_STATES.pending);
  assert.equal(recordHostReply(visit, { host: 'otro', accepts: true, at: '2026-10-08T15:06:00Z' }), visit);
  visit = recordHostReply(visit, { host: 'frank', accepts: true, at: '2026-10-08T15:07:00Z' });
  assert.equal(visit.host, 'frank');
});

test('replies without a clear order wait for Francisco (AC-003)', () => {
  let visit = pendingVisit();
  visit = recordHostReply(visit, { host: 'nico', accepts: true, at: '2026-10-08T15:05:00Z' });
  visit = recordHostReply(visit, { host: 'frank', accepts: true, at: '2026-10-08T15:05:00Z' });
  assert.equal(visit.state, VISIT_STATES.pending);
  assert.equal(visit.host, null);
  assert.equal(visit.needsOwner, true);
  assert.throws(() => confirmByOwner(visit));

  visit = assignByOwner(visit, 'frank');
  assert.equal(visit.host, 'frank');
  assert.equal(visit.needsOwner, false);
});

test('the tie margin is configurable', () => {
  let visit = pendingVisit();
  visit = recordHostReply(visit, { host: 'nico', accepts: true, at: '2026-10-08T15:05:00Z' });
  const reply = { host: 'frank', accepts: true, at: '2026-10-08T15:05:20Z' };
  assert.equal(recordHostReply(visit, reply).host, 'nico');
  assert.equal(recordHostReply(visit, reply, { tieMs: 30000 }).needsOwner, true);
});

test('two refusals or no answer in time go back to Francisco', () => {
  let visit = pendingVisit();
  visit = recordHostReply(visit, { host: 'nico', accepts: false, at: '2026-10-08T15:05:00Z' });
  visit = recordHostReply(visit, { host: 'frank', accepts: false, at: '2026-10-08T15:06:00Z' });
  assert.equal(visit.state, VISIT_STATES.reschedule);
  assert.equal(visit.needsOwner, true);

  const schedule = createVisitSchedule(HOLIDAYS);
  const waiting = pendingVisit({ date: TUESDAY });
  assert.equal(expireVisit(schedule, waiting, '2026-10-09T14:59:00Z'), waiting);
  assert.equal(expireVisit(schedule, waiting, '2026-10-09T15:00:00Z').state, VISIT_STATES.reschedule);
  assert.equal(expireVisit(schedule, waiting, '2026-10-08T16:00:00Z', 60 * 60 * 1000).state, VISIT_STATES.reschedule);
});

test('a request whose hour has passed stops waiting for the hosts', () => {
  const schedule = createVisitSchedule(HOLIDAYS);
  const waiting = pendingVisit({ date: '2026-10-08', time: '14:30' });
  assert.equal(expireVisit(schedule, waiting, '2026-10-08T17:29:00Z'), waiting); // 14:29 in Santiago
  assert.equal(expireVisit(schedule, waiting, '2026-10-08T17:30:00Z').state, VISIT_STATES.reschedule);
});

test('the question to a host greets by the Santiago hour and says nothing about the prospect', () => {
  const schedule = createVisitSchedule(HOLIDAYS);
  const visit = pendingVisit({ date: TUESDAY });
  assert.equal(
    availabilityQuestion(schedule, visit, 'Nico', NOW),
    'Hola Nico, cómo estás?, buenas tardes!, tienes disponibilidad para una visita el martes 13 de octubre a las 10:30?',
  );
  assert.match(availabilityQuestion(schedule, visit, 'Frank', '2026-10-08T13:00:00Z'), /^Hola Frank, cómo estás\?, buenos días!/);
  assert.match(availabilityQuestion(schedule, visit, 'Frank', '2026-10-09T01:00:00Z'), /buenas noches!/);
});

test('the reply buttons carry the visit, so an answer names the question it belongs to', () => {
  const buttons = availabilityButtons(pendingVisit());
  assert.deepEqual(buttons.map((button) => button.title), ['Sí puedo', 'No puedo']);
  assert.deepEqual(parseHostButton(buttons[0].id), { visitId: 'V-1', accepts: true });
  assert.deepEqual(parseHostButton(buttons[1].id), { visitId: 'V-1', accepts: false });
  for (const id of ['visita:V-1:quizas', 'si', '', null]) assert.equal(parseHostButton(id), null);
});

test('only a plain yes or no counts as a host answer', () => {
  for (const text of ['Sí', 'si', 'SÍ!', 'Sí, puedo', 'puedo', 'sí tengo']) assert.equal(parseHostReply(text), true);
  for (const text of ['No', 'no puedo', 'No, no puedo.', 'no tengo']) assert.equal(parseHostReply(text), false);
  for (const text of ['sí pero más tarde', 'no sé', 'a las 11 mejor', '👍', '', null]) {
    assert.equal(parseHostReply(text), null);
  }
});

test('only the official holidays of the calendar file block their days, not the celebrations', () => {
  const event = (start, end, description) => [
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
  ];
  const ics = [
    'BEGIN:VCALENDAR',
    ...event('20300101', '20300102', 'Día festivo'),
    ...event('20300418', '20300419', 'Celebración\\nPara ocultar las celebraciones\\, ve a'),
    ...event('20300918', '20300920', 'Día festivo\\nLa fecha es provisional y puede cambiar.'),
    ...event('20301225', '20301226', 'Día festivo'),
    ...event('20310101', '20310102', 'Día festivo'),
    'END:VCALENDAR',
  ].join('\r\n');
  assert.deepEqual(parseGoogleHolidayIcs(ics), {
    2030: ['2030-01-01', '2030-09-18', '2030-09-19', '2030-12-25'],
  });
});

test('the saved holiday list blocks official holidays and leaves celebrations and working days open', () => {
  const schedule = createVisitSchedule(loadHolidayCalendar());
  assert.equal(schedule.check(HOLIDAY_MONDAY, '10:30').reason, REJECTIONS.holiday);
  assert.equal(schedule.check('2026-12-31', '10:30').ok, true); // "Celebración" in Google's calendar
  assert.equal(schedule.check(TUESDAY, '10:30').ok, true);
});

test('days added by hand block a visit too', () => {
  const file = path.join(os.tmpdir(), `nrc-holidays-${process.pid}.json`);
  fs.writeFileSync(file, JSON.stringify({ extra: ['2026-10-13'], years: { 2026: ['2026-01-01'] } }));
  try {
    assert.equal(createVisitSchedule(loadHolidayCalendar(file)).check(TUESDAY, '10:30').reason, REJECTIONS.holiday);
  } finally {
    fs.unlinkSync(file);
  }
});

test('nothing can be told to the prospect before Francisco confirms (AC-004, AC-005)', () => {
  let visit = pendingVisit();
  assert.throws(() => confirmByOwner(visit));
  assert.throws(() => confirmationDetails(visit));

  visit = recordHostReply(visit, { host: 'nico', accepts: true, at: '2026-10-08T15:05:00Z' });
  assert.throws(() => confirmationDetails(visit));

  visit = confirmByOwner(visit);
  assert.deepEqual(confirmationDetails(visit), {
    visitId: 'V-1',
    prospectId: 22,
    date: FRIDAY,
    time: '10:30',
    host: 'nico',
    address: NRC_ADDRESS,
  });
});

test('a visit closes only through the allowed states', () => {
  const pending = pendingVisit();
  assert.throws(() => closeVisit(pending, VISIT_STATES.done));
  assert.equal(closeVisit(pending, VISIT_STATES.cancelled).state, VISIT_STATES.cancelled);

  const assigned = recordHostReply(pending, { host: 'nico', accepts: true, at: '2026-10-08T15:05:00Z' });
  const confirmed = confirmByOwner(assigned);
  assert.equal(closeVisit(confirmed, VISIT_STATES.done).state, VISIT_STATES.done);
  assert.equal(closeVisit(confirmed, VISIT_STATES.reschedule).state, VISIT_STATES.reschedule);

  const done = closeVisit(confirmed, VISIT_STATES.done);
  assert.throws(() => closeVisit(done, VISIT_STATES.cancelled));
  assert.equal(recordHostReply(done, { host: 'frank', accepts: true, at: '2026-10-08T15:09:00Z' }), done);
});
