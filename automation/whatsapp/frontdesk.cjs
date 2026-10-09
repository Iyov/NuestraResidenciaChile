const { MOTIVES, classifyMessage } = require('./classifier.cjs');

const FRONTDESK_DEFAULTS = Object.freeze({
  timeZone: 'America/Santiago',
  reminderDelayMs: 2 * 60 * 60 * 1000,
  reminderStartHour: 9,
  reminderEndHour: 21,
});

const FAILURE_NOTICE = 'No pude procesar un mensaje de Nuestra Residencia. Revisa el WhatsApp de NRC.';
// A form link is the wrong answer to these; they go straight to Francisco.
const NO_FORM_MOTIVES = [MOTIVES.noContact, MOTIVES.complaint, MOTIVES.identity];
const COMMAND_HELP = 'No reconozco ese comando. Puedes usar: reactivar 22, reactivar todos, pausar 22 o estado.';

/**
 * Core of the WhatsApp front desk (SPEC-002). It has no network or sheet code:
 * every side effect goes through an injected port, so it runs under synthetic tests.
 *
 * Ports:
 *   knowledge  approvedText(id), isApproved(id)
 *   prospects  findByPhone(phone) -> [{ id, contactName }], findPhonesById(id) -> [phone]
 *   messenger  send(chatId, text), notifyOwner(text)
 *   store      markProcessed(eventId) -> true when new, getChat(key), putChat(key, state), listChats() -> [[key, state]]
 *   events     append({ at, prospectId, type, derivation })
 *   log        optional; receives { eventId, prospectId, outcome } and never message text
 */
function createFrontdesk(ports, options) {
  const config = Object.assign({}, FRONTDESK_DEFAULTS, options);
  const ownerPhone = normalizePhone(config.ownerPhone);
  if (!ownerPhone) throw new Error('The owner phone is required.');

  const { knowledge, prospects, messenger, store, events } = ports;
  const classify = ports.classify || classifyMessage;
  const log = ports.log || function () {};

  /**
   * An event is marked as processed before anything is sent, so a failure never
   * repeats messages to a prospect on retry. Francisco gets a generic notice instead.
   */
  async function guarded(event, work) {
    if (!(await store.markProcessed(event.eventId))) return 'duplicate';
    try {
      return await work();
    } catch (error) {
      try {
        await messenger.notifyOwner(FAILURE_NOTICE);
      } catch (noticeError) {
        // Nothing else can be done here; the log entry below is the only trace.
      }
      return finish(event, null, 'error');
    }
  }

  function handleInbound(event) {
    return guarded(event, () => processInbound(event));
  }

  function handleEcho(event) {
    return guarded(event, () => processEcho(event));
  }

  async function processInbound(event) {

    const phone = normalizePhone(event.phone);
    if (phone && phone === ownerPhone) return finish(event, null, await handleOwnerCommand(event));

    const key = phone || event.chatId;
    const chat = (await store.getChat(key)) || newChat();
    const matches = phone ? await prospects.findByPhone(phone) : [];
    const ids = Array.from(new Set(matches.map((match) => match.id)));

    let outcome;
    if (chat.paused) {
      outcome = 'paused';
    } else if (ids.length > 1) {
      // Never pick a prospect on behalf of Francisco: no ID is recorded for this chat.
      outcome = await derive(event, chat, MOTIVES.outOfBase);
    } else {
      if (ids.length === 1) {
        chat.prospectId = ids[0];
        chat.shortName = shortName(matches[0].contactName);
      }
      outcome = await respond(event, chat);
    }

    await store.putChat(key, chat);
    return finish(event, chat.prospectId, outcome);
  }

  /**
   * Approved answers are public facts, so a number that is not in the sheet gets
   * them too, followed once by the form. Unknown numbers never get a row or an
   * ID from WhatsApp.
   */
  async function respond(event, chat) {
    if (chat.pending) return 'awaiting-owner';

    const known = chat.prospectId !== null;
    const result = event.kind === 'text'
      ? classify(event.text) || {}
      : { intent: 'derive', motive: MOTIVES.attachment };

    if (result.intent === 'faq') {
      const answer = knowledge.approvedText(result.faqId);
      if (answer) {
        await greetOnce(event, chat);
        await messenger.send(event.chatId, answer);
        await events.append({ at: event.at, prospectId: chat.prospectId, type: result.faqId, derivation: '' });
        if (!known) await offerForm(event, chat);
        return result.faqId;
      }
    }

    if (result.intent === 'closing') return 'no-reply';

    if (result.intent === 'greeting') {
      if (!chat.greeted) {
        await greetOnce(event, chat);
        return 'greeted';
      }
      const followUp = knowledge.approvedText('MSG-05');
      if (followUp && !chat.followUpSent) {
        await messenger.send(event.chatId, followUp);
        chat.followUpSent = true;
        return 'MSG-05';
      }
    }

    const motive = Object.values(MOTIVES).includes(result.motive) ? result.motive : MOTIVES.outOfBase;
    if (known || NO_FORM_MOTIVES.includes(motive)) return derive(event, chat, motive);

    if (await offerForm(event, chat)) return 'form-sent';
    return derive(event, chat, motive === MOTIVES.outOfBase ? MOTIVES.unknownNumber : motive);
  }

  /** The form is offered once per chat; true when it was sent now. */
  async function offerForm(event, chat) {
    const formText = knowledge.approvedText('MSG-02');
    if (chat.formSent || !formText) return false;
    await greetOnce(event, chat);
    await messenger.send(event.chatId, formText);
    chat.formSent = true;
    await events.append({ at: event.at, prospectId: null, type: 'formulario enviado', derivation: '' });
    return true;
  }

  async function derive(event, chat, motive) {
    if (chat.pending) return 'awaiting-owner';

    const handoverText = knowledge.approvedText('MSG-03');
    if (handoverText) {
      await greetOnce(event, chat);
      await messenger.send(event.chatId, handoverText);
    }

    chat.pending = { motive, since: toMillis(event.at), reminded: false };
    await messenger.notifyOwner(pendingNotice('Tienes una respuesta pendiente de Nuestra Residencia', chat));
    await events.append({
      at: event.at,
      prospectId: chat.prospectId,
      type: 'derivado: ' + motive,
      derivation: 'pendiente',
    });
    return 'derived';
  }

  /** MSG-01 asks for the name; MSG-06 uses the one from the form when the sheet has it. */
  async function greetOnce(event, chat) {
    if (chat.greeted) return;
    const name = firstName(chat.shortName);
    const named = name ? knowledge.approvedText('MSG-06') : null;
    const greeting = named ? named.replace('{nombre}', () => name) : knowledge.approvedText('MSG-01');
    if (!greeting) return;
    await messenger.send(event.chatId, greeting.replace(/buenas tardes/i, greetingForHour(event.at)));
    chat.greeted = true;
  }

  /** A message Francisco sent from the WhatsApp Business app: he owns that chat from now on. */
  async function processEcho(event) {
    const key = normalizePhone(event.phone) || event.chatId;
    if (key === ownerPhone) return 'ignored';

    const chat = (await store.getChat(key)) || newChat();
    if (chat.prospectId === null && normalizePhone(event.phone)) {
      // Francisco may write first; resolve the ID so `estado` and the sheet can name the chat.
      const ids = new Set((await prospects.findByPhone(key)).map((match) => match.id));
      if (ids.size === 1) chat.prospectId = ids.values().next().value;
    }
    const hadPending = Boolean(chat.pending);
    const changed = !chat.paused || hadPending;
    chat.paused = true;
    chat.pending = null;
    await store.putChat(key, chat);

    if (changed) {
      await events.append({
        at: event.at,
        prospectId: chat.prospectId,
        type: 'tomado por Francisco',
        derivation: hadPending ? 'resuelta' : '',
      });
    }
    return finish(event, chat.prospectId, 'taken-over');
  }

  async function handleOwnerCommand(event) {
    const words = event.kind === 'text' ? String(event.text || '').trim().toLowerCase().split(/\s+/) : [];
    const verb = words[0];
    const target = words[1];
    let reply = COMMAND_HELP;

    if (words.length === 1 && verb === 'estado') {
      reply = await statusSummary();
    } else if (words.length === 2 && verb === 'reactivar' && target === 'todos') {
      const paused = (await store.listChats()).filter((entry) => entry[1].paused);
      for (const [key, chat] of paused) await resume(key, chat, event.at);
      reply = 'Listo, asistente activo en ' + paused.length + (paused.length === 1 ? ' chat' : ' chats');
    } else if (words.length === 2 && (verb === 'reactivar' || verb === 'pausar') && /^\d+$/.test(target)) {
      reply = await setPausedById(Number(target), verb === 'pausar', event.at);
    }

    await messenger.send(event.chatId, reply);
    return 'owner-command';
  }

  async function setPausedById(id, paused, at) {
    const phones = (await prospects.findPhonesById(id)).map(normalizePhone).filter(Boolean);
    if (!phones.length) return 'No encuentro el ID ' + id + ' en la hoja';

    for (const phone of new Set(phones)) {
      const chat = (await store.getChat(phone)) || newChat();
      chat.prospectId = id;
      if (paused) {
        chat.paused = true;
        await store.putChat(phone, chat);
        await events.append({ at, prospectId: id, type: 'pausado', derivation: '' });
      } else {
        await resume(phone, chat, at);
      }
    }
    return paused
      ? 'Listo, asistente en pausa para el ID ' + id
      : 'Listo, asistente activo para el ID ' + id;
  }

  async function resume(key, chat, at) {
    const hadPending = Boolean(chat.pending);
    chat.paused = false;
    chat.pending = null;
    await store.putChat(key, chat);
    await events.append({
      at,
      prospectId: chat.prospectId,
      type: 'reactivado',
      derivation: hadPending ? 'resuelta' : '',
    });
  }

  async function statusSummary() {
    const chats = (await store.listChats()).map((entry) => entry[1]);
    return 'En pausa: ' + describeChats(chats.filter((chat) => chat.paused)) +
      '. Pendientes: ' + describeChats(chats.filter((chat) => chat.pending));
  }

  /** Run on a schedule. Sends at most one reminder per pending handover, in daytime only. */
  async function sendDueReminders(now) {
    const hour = hourInZone(now, config.timeZone);
    if (hour < config.reminderStartHour || hour >= config.reminderEndHour) return 0;

    let sent = 0;
    for (const [key, chat] of await store.listChats()) {
      const pending = chat.pending;
      if (!pending || pending.reminded) continue;
      if (toMillis(now) - pending.since < config.reminderDelayMs) continue;
      await messenger.notifyOwner(pendingNotice('Recordatorio: sigue pendiente una respuesta de Nuestra Residencia', chat));
      pending.reminded = true;
      await store.putChat(key, chat);
      sent += 1;
    }
    return sent;
  }

  function greetingForHour(at) {
    const hour = hourInZone(at, config.timeZone);
    if (hour >= 5 && hour < 12) return 'buenos días';
    if (hour >= 12 && hour < 20) return 'buenas tardes';
    return 'buenas noches';
  }

  function finish(event, prospectId, outcome) {
    log({ eventId: event.eventId, prospectId: prospectId || null, outcome });
    return outcome;
  }

  return { handleInbound, handleEcho, sendDueReminders };
}

function newChat() {
  return {
    prospectId: null,
    shortName: '',
    greeted: false,
    formSent: false,
    followUpSent: false,
    paused: false,
    pending: null,
  };
}

function pendingNotice(lead, chat) {
  const who = chat.prospectId === null
    ? 'sin ID'
    : 'ID ' + chat.prospectId + (chat.shortName ? ' · ' + chat.shortName : '');
  return lead + ' · ' + who + ' · motivo: ' + chat.pending.motive;
}

function describeChats(chats) {
  if (!chats.length) return 'ninguno';
  const ids = chats.map((chat) => chat.prospectId).filter((id) => id !== null).sort((a, b) => a - b);
  const withoutId = chats.length - ids.length;
  return ids.map(String).concat(withoutId ? ['sin ID (' + withoutId + ')'] : []).join(', ');
}

/** "María Pérez Soto" -> "María P.": enough to find the chat, without the full name. */
function shortName(fullName) {
  const parts = String(fullName === null || fullName === undefined ? '' : fullName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return parts.length === 1 ? parts[0] : parts[0] + ' ' + parts[1].charAt(0).toUpperCase() + '.';
}

/** "ana P." -> "Ana". Empty when the form value does not look like a name, so the greeting asks for it. */
function firstName(name) {
  const word = String(name === null || name === undefined ? '' : name).trim().split(/\s+/)[0];
  if (!/^\p{L}{2,}$/u.test(word)) return '';
  return word.charAt(0).toLocaleUpperCase('es') + word.slice(1).toLocaleLowerCase('es');
}

// Same rules as normalizeNrcPhone_ in automation/apps-script/AssignLeadId.gs, so both flows agree on identity.
function normalizePhone(value) {
  let digits = String(value === null || value === undefined ? '' : value).replace(/\D/g, '');
  if (digits.indexOf('00') === 0) digits = digits.substring(2);
  if (!digits) return '';
  if (digits.indexOf('56') === 0) return digits;
  if (digits.indexOf('0') === 0) digits = digits.substring(1);
  if (digits.length === 8 || digits.length === 9) return '56' + digits;
  return digits;
}

function toMillis(at) {
  return at instanceof Date ? at.getTime() : new Date(at).getTime();
}

function hourInZone(at, timeZone) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' })
    .format(new Date(toMillis(at))));
}

module.exports = { createFrontdesk, firstName, normalizePhone, shortName };
