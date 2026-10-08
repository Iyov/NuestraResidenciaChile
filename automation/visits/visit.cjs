const VISIT_STATES = Object.freeze({
  pending: 'pendiente de disponibilidad',
  assigned: 'anfitrión asignado',
  confirmed: 'confirmada por Francisco',
  done: 'realizada',
  cancelled: 'cancelada',
  reschedule: 'reagendar',
});

const DESISTED = 'prospecto desistió';
// Francisco, 2026-10-08: no fixed wait; the hosts sometimes take many hours.
const DEFAULT_HOST_WAIT_MS = 24 * 60 * 60 * 1000;
const HOST_YES = ['si', 'si puedo', 'puedo', 'yo puedo', 'si yo puedo', 'si tengo', 'tengo', 'si tengo disponibilidad'];
const HOST_NO = ['no', 'no puedo', 'yo no puedo', 'no no puedo', 'no tengo', 'no no tengo', 'no tengo disponibilidad'];
const NRC_ADDRESS = 'Camino Las Flores 10961, Las Condes';

/**
 * Visit coordination of SPEC-003 as pure functions: each one returns a new
 * visit and sends nothing. The only text meant for the hosts is the
 * availability question; nothing here writes to a prospect.
 *
 * request: { visitId, prospectId, date, time, hosts, prospectDesisted, prospectAsked }
 * Returns { ok: true, visit } or { ok: false, reason, alternatives }. A rejected
 * request has no visit, so there is nothing to send to the hosts.
 */
function requestVisit(schedule, request, now) {
  const hosts = Array.from(new Set(request.hosts || []));
  if (!hosts.length) throw new Error('At least one host is required.');

  // A prospect marked red only gets a visit when the request came from them.
  if (request.prospectDesisted && !request.prospectAsked) {
    return { ok: false, reason: DESISTED, alternatives: [] };
  }

  const verdict = schedule.check(request.date, request.time, now);
  if (!verdict.ok) {
    const today = schedule.localNow(now);
    const asked = { date: request.date, time: request.time };
    const laterThanNow = `${asked.date} ${asked.time}` > `${today.date} ${today.time}`;
    const fromAsked = schedule.alternatives(asked);
    return {
      ok: false,
      reason: verdict.reason,
      alternatives: laterThanNow && fromAsked.length ? fromAsked : schedule.alternatives(today),
    };
  }

  return {
    ok: true,
    visit: {
      visitId: request.visitId,
      prospectId: request.prospectId,
      date: request.date,
      time: request.time,
      reservedMinutes: schedule.reservedMinutes,
      hosts,
      state: VISIT_STATES.pending,
      host: null,
      needsOwner: false,
      replies: {},
      requestedAt: new Date(now).getTime(),
    },
  };
}

/**
 * The one message the assistant may send to a host. Wording by Francisco
 * (2026-10-08); the greeting follows the Santiago hour at which it is sent.
 */
function availabilityQuestion(schedule, visit, hostName, now) {
  const hour = Number(schedule.localNow(now).time.slice(0, 2));
  const greeting = hour >= 5 && hour < 12 ? 'buenos días' : hour >= 12 && hour < 20 ? 'buenas tardes' : 'buenas noches';
  const parts = {};
  for (const part of new Intl.DateTimeFormat('es-CL', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(new Date(`${visit.date}T00:00:00Z`))) {
    parts[part.type] = part.value;
  }
  return (
    `Hola ${hostName}, cómo estás?, ${greeting}!, tienes disponibilidad para una visita ` +
    `el ${parts.weekday} ${parts.day} de ${parts.month} a las ${visit.time}?`
  );
}

/** true, false, or null when the answer is anything but a plain yes or no; null goes to Francisco. */
function parseHostReply(text) {
  const plain = String(text === null || text === undefined ? '' : text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (HOST_YES.includes(plain)) return true;
  if (HOST_NO.includes(plain)) return false;
  return null;
}

/**
 * reply: { host, accepts, at }. The first "yes" wins. A second "yes" that is
 * not clearly later than the first (within `tieMs`) leaves the visit without a
 * host until Francisco decides. Only the first reply of each host counts.
 */
function recordHostReply(visit, reply, options) {
  const tieMs = (options && options.tieMs) || 0;
  const open = visit.state === VISIT_STATES.pending || visit.state === VISIT_STATES.assigned;
  if (!open || !visit.hosts.includes(reply.host) || visit.replies[reply.host]) return visit;

  const at = new Date(reply.at).getTime();
  if (isNaN(at)) throw new Error('Invalid reply time.');
  const accepts = reply.accepts === true;
  const next = Object.assign({}, visit, {
    replies: Object.assign({}, visit.replies, { [reply.host]: { accepts, at } }),
  });

  if (accepts) {
    if (visit.state === VISIT_STATES.pending && !visit.needsOwner) {
      next.state = VISIT_STATES.assigned;
      next.host = reply.host;
    } else if (visit.state === VISIT_STATES.assigned && at <= visit.replies[visit.host].at + tieMs) {
      next.state = VISIT_STATES.pending;
      next.host = null;
      next.needsOwner = true;
    }
  } else if (visit.state === VISIT_STATES.pending && everyHostDeclined(next)) {
    next.state = VISIT_STATES.reschedule;
    next.needsOwner = true;
  }
  return next;
}

/** Francisco settles a tie by choosing one of the hosts that accepted. */
function assignByOwner(visit, host) {
  const reply = visit.replies[host];
  if (visit.state !== VISIT_STATES.pending || !visit.needsOwner || !reply || !reply.accepts) {
    throw new Error('This visit cannot be assigned to that host.');
  }
  return Object.assign({}, visit, { state: VISIT_STATES.assigned, host, needsOwner: false });
}

/** A request without a host goes back to Francisco after the wait, or once its hour has passed. */
function expireVisit(schedule, visit, now, waitMs = DEFAULT_HOST_WAIT_MS) {
  if (visit.state !== VISIT_STATES.pending || visit.needsOwner) return visit;
  const today = schedule.localNow(now);
  const slotPassed = `${visit.date} ${visit.time}` <= `${today.date} ${today.time}`;
  if (!slotPassed && new Date(now).getTime() - visit.requestedAt < waitMs) return visit;
  return Object.assign({}, visit, { state: VISIT_STATES.reschedule, needsOwner: true });
}

function confirmByOwner(visit) {
  if (visit.state !== VISIT_STATES.assigned) throw new Error('Only a visit with an assigned host can be confirmed.');
  return Object.assign({}, visit, { state: VISIT_STATES.confirmed });
}

/** What Francisco's confirmation to the prospect has to contain; it does not exist before he confirms. */
function confirmationDetails(visit) {
  if (visit.state !== VISIT_STATES.confirmed) throw new Error('The visit is not confirmed.');
  return {
    visitId: visit.visitId,
    prospectId: visit.prospectId,
    date: visit.date,
    time: visit.time,
    host: visit.host,
    address: NRC_ADDRESS,
  };
}

function closeVisit(visit, outcome) {
  const fromConfirmed = [VISIT_STATES.done, VISIT_STATES.cancelled, VISIT_STATES.reschedule];
  const beforeConfirmed = [VISIT_STATES.pending, VISIT_STATES.assigned];
  const allowed =
    (visit.state === VISIT_STATES.confirmed && fromConfirmed.includes(outcome)) ||
    (beforeConfirmed.includes(visit.state) && outcome === VISIT_STATES.cancelled);
  if (!allowed) throw new Error('That change of state is not allowed.');
  return Object.assign({}, visit, { state: outcome, needsOwner: false });
}

function everyHostDeclined(visit) {
  return visit.hosts.every((host) => visit.replies[host] && !visit.replies[host].accepts);
}

module.exports = {
  DEFAULT_HOST_WAIT_MS,
  DESISTED,
  NRC_ADDRESS,
  VISIT_STATES,
  assignByOwner,
  availabilityQuestion,
  closeVisit,
  confirmByOwner,
  confirmationDetails,
  expireVisit,
  parseHostReply,
  recordHostReply,
  requestVisit,
};
