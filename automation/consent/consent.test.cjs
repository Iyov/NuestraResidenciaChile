const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CHANNELS,
  FORM_SOURCE,
  PURPOSES,
  REFUSALS,
  createNoticeHistory,
  mayContact,
  readFormConsent,
  withdraw,
} = require('./consent.cjs');

// Synthetic fixtures only. No notice is published: these versions and dates are examples.
const HISTORY = createNoticeHistory([
  { version: 'aviso-2', from: '2027-03-01T03:00:00Z' },
  { version: 'aviso-1', from: '2026-11-02T03:00:00Z' },
]);
const BEFORE_NOTICE = '2026-10-08T15:00:00Z';
const UNDER_FIRST = '2026-11-10T15:00:00Z';
const UNDER_SECOND = '2027-03-05T15:00:00Z';
const TICKED = 'He leído el aviso y autorizo el contacto.';

function row(overrides) {
  return Object.assign({ submittedAt: UNDER_FIRST, requestAnswer: TICKED, newsAnswer: '' }, overrides);
}

function outbound(overrides) {
  return Object.assign({ purpose: PURPOSES.request, channel: CHANNELS.whatsapp, desisted: false }, overrides);
}

test('a row keeps purpose, channels, date, source and notice version (AC-004)', () => {
  const record = readFormConsent(HISTORY, row({ newsAnswer: TICKED }));
  assert.deepEqual(record, {
    source: FORM_SOURCE,
    at: '2026-11-10T15:00:00.000Z',
    noticeVersion: 'aviso-1',
    grants: {
      [PURPOSES.request]: { channels: [CHANNELS.phone, CHANNELS.whatsapp, CHANNELS.email], withdrawn: null },
      [PURPOSES.news]: { channels: [CHANNELS.whatsapp, CHANNELS.email], withdrawn: null },
    },
    optOut: null,
  });
  assert.equal(readFormConsent(HISTORY, row({ submittedAt: UNDER_SECOND })).noticeVersion, 'aviso-2');
});

test('a row without a live notice or without the mandatory box is not a permission', () => {
  assert.equal(readFormConsent(HISTORY, row({ submittedAt: BEFORE_NOTICE })), null);
  assert.equal(readFormConsent(HISTORY, row({ requestAnswer: '  ' })), null);
  assert.equal(readFormConsent(HISTORY, row({ submittedAt: 'no es una fecha' })), null);
  assert.equal(readFormConsent(createNoticeHistory([]), row()), null);
  assert.throws(() => createNoticeHistory([{ version: 'aviso-1', from: 'no es una fecha' }]));
});

test('news need their own box; the request box does not cover them (AC-003)', () => {
  const requestOnly = readFormConsent(HISTORY, row());
  assert.deepEqual(mayContact(requestOnly, outbound()), { ok: true });
  assert.deepEqual(mayContact(requestOnly, outbound({ purpose: PURPOSES.news })), {
    ok: false,
    reason: REFUSALS.notGranted,
  });

  const both = readFormConsent(HISTORY, row({ newsAnswer: TICKED }));
  assert.deepEqual(mayContact(both, outbound({ purpose: PURPOSES.news, channel: CHANNELS.email })), { ok: true });
  assert.deepEqual(mayContact(both, outbound({ purpose: PURPOSES.news, channel: CHANNELS.phone })), {
    ok: false,
    reason: REFUSALS.channel,
  });
});

test('nothing goes out without a record, to a red row or when in doubt', () => {
  const record = readFormConsent(HISTORY, row({ newsAnswer: TICKED }));
  assert.equal(mayContact(null, outbound()).reason, REFUSALS.noRecord);
  assert.equal(mayContact(record, outbound({ desisted: true })).reason, REFUSALS.desisted);
  assert.equal(mayContact(record, { purpose: PURPOSES.request, channel: CHANNELS.whatsapp }).reason, REFUSALS.desisted);
  assert.equal(mayContact(record, outbound({ purpose: 'encuesta' })).reason, REFUSALS.unknown);
  assert.equal(mayContact(record, outbound({ channel: 'sms' })).reason, REFUSALS.unknown);
  assert.equal(mayContact(record, undefined).reason, REFUSALS.unknown);
});

test('withdrawing news leaves the request untouched', () => {
  const record = readFormConsent(HISTORY, row({ newsAnswer: TICKED }));
  const withdrawn = withdraw(record, { purpose: PURPOSES.news, at: UNDER_SECOND, source: 'whatsapp' });

  assert.equal(mayContact(withdrawn, outbound({ purpose: PURPOSES.news })).reason, REFUSALS.withdrawn);
  assert.deepEqual(mayContact(withdrawn, outbound()), { ok: true });
  assert.deepEqual(withdrawn.grants[PURPOSES.news].withdrawn, { at: '2027-03-05T15:00:00.000Z', source: 'whatsapp' });
  assert.equal(record.grants[PURPOSES.news].withdrawn, null);
  assert.throws(() => withdraw(record, { purpose: 'encuesta', at: UNDER_SECOND }));
  assert.throws(() => withdraw(record, { at: 'no es una fecha' }));
});

test('a full opt-out stops every purpose and channel, also without a record (AC-005)', () => {
  const record = readFormConsent(HISTORY, row({ newsAnswer: TICKED }));
  const optedOut = withdraw(record, { at: UNDER_SECOND, source: 'correo' });
  for (const purpose of Object.values(PURPOSES)) {
    for (const channel of Object.values(CHANNELS)) {
      assert.equal(mayContact(optedOut, outbound({ purpose, channel })).reason, REFUSALS.withdrawn);
    }
  }

  const legacy = withdraw(null, { at: BEFORE_NOTICE, source: 'whatsapp' });
  assert.equal(legacy.noticeVersion, null);
  assert.equal(mayContact(legacy, outbound()).reason, REFUSALS.withdrawn);

  const again = withdraw(optedOut, { at: '2027-06-01T15:00:00Z', source: 'whatsapp' });
  assert.deepEqual(again.optOut, { at: '2027-03-05T15:00:00.000Z', source: 'correo' });
});

test('a new incoming message is answered and reactivates nothing (AC-005)', () => {
  const optedOut = withdraw(readFormConsent(HISTORY, row({ newsAnswer: TICKED })), { at: UNDER_SECOND, source: 'whatsapp' });
  const reply = { purpose: PURPOSES.request, channel: CHANNELS.whatsapp, desisted: true, inbound: true };

  assert.deepEqual(mayContact(optedOut, reply), { ok: true });
  assert.deepEqual(mayContact(null, reply), { ok: true });
  assert.equal(mayContact(optedOut, Object.assign({}, reply, { purpose: PURPOSES.news })).ok, false);
  assert.equal(mayContact(optedOut, outbound()).reason, REFUSALS.withdrawn);
});
