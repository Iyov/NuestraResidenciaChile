const MOTIVES = Object.freeze({
  noContact: 'petición de no ser contactado',
  complaint: 'reclamo o urgencia',
  identity: 'pregunta si es persona o sistema',
  health: 'salud o autovalencia',
  availability: 'disponibilidad',
  commercial: 'precio o pago',
  attachment: 'audio o archivo',
  outOfBase: 'pregunta fuera de la base',
  unknownNumber: 'número desconocido',
});

const MAX_CLASSIFIABLE_LENGTH = 200;

// Reserved topics always go to Francisco, even when the message also matches an answer.
// Order is priority: the first match names the motive.
const RESERVED_RULES = [
  [MOTIVES.noContact, /\bno (me |nos )?(contacten|escriban|llamen|molesten)|\bborr(ar|en|a) mis datos|\bdejen? de (escribir|llamar|contactar)|\bno quiero (mas|recibir)|\bdar(me)? de baja/],
  [MOTIVES.complaint, /\breclamo|\bqueja|\bmolest[oa]\b|\bdenuncia|\burgen|\bemergencia|\bestafa/],
  [MOTIVES.identity, /\bbot\b|\brobot|inteligencia artificial|\bia\b|\bpersona real|\bhumano|\bmaquina|\bautomatic|\beres (tu|una persona|francisco)|\bde verdad eres/],
  // "enfermeras" is a question about the team (FAQ-13), not about someone's health.
  [MOTIVES.health, /\bsalud|\benferm(?!er)|\bdiagnost|\bmedic|\bremedio|\balzheimer|\bdemencia|\bparkinson|\bsilla de ruedas|\bpostrad|\bautovalen|\bdependien|\bmovilidad|\bpanal|\boxigeno|\bdiabet|\bcuidados|\bcalifica|\bacv\b|\boperad|\bcaida/],
  [MOTIVES.availability, /\bdisponib|\bcupos?\b|\bvacantes?\b|\bhay (habitacion|pieza|lugar|espacio)|\bquedan (habitacion|pieza)|\breserv|\bcotiza|\blista de espera|\bingresar\b|\bingreso\b/],
  [MOTIVES.commercial, /\bdescuento|\brebaja|\bpromo|\bdobles?\b|\bcompartid|\bmatrimonio|\bpareja|\bformas? de pago|\bcuota|\bcontrato|\bgarantia|\btransferencia|\btarjeta|\bboleta|\bfactura|\bisapre|\bfonasa|\bconvenio|\biva\b|\bnegocia/],
];

const FAQ_RULES = [
  ['FAQ-01', /\bdonde (estan|esta|queda|quedan|se ubica|se ubican|se encuentra|se encuentran)|\bdireccion|\bubicacion|\bubicad|\bcomo llego|\bcomo llegar/],
  ['FAQ-02', /\bvisita|\bconocer (el lugar|la residencia|las instalaciones)|\bagendar|\bir a ver|\brecorrido|\bhorario/],
  ['FAQ-03', /\bsabados?\b|\bdomingos?\b|\bfin(es)? de semana|\bfestivo|\bferiado/],
  ['FAQ-04', /\bpara quien(es)?\b|\bque tipo de (personas|residentes)|\ba quien(es)? reciben/],
  ['FAQ-05', /\btipos? de (habitacion|pieza)|\bhabitaciones\b|\bpiezas\b|\bbano privado/],
  ['FAQ-06', /\bque incluye|\bincluid[oa]s?\b|\bque viene|\bcomidas\b|\blavanderia|\blimpieza/],
  ['FAQ-07', /\bactividades|\btalleres|\bque hacen (en el dia|durante el dia)/],
  ['FAQ-08', /\bprecios?\b|\bvalor(es)?\b|\bcuanto (cuesta|sale|vale|es|cobran|seria)|\bcostos?\b|\bmensualidad|\btarifas?\b/],
  ['FAQ-09', /\bcorreo|\bmail\b|\bemail\b|\botro medio|\bformulario/],
  ['FAQ-10', /\bpagina\b|\bsitio\b|\bweb\b|\bmas informacion|\bfotos\b|\binstagram|\bfacebook/],
  ['FAQ-11', /\bexperiencia|\bquien(es)? (esta|estan) detras|\bduenos?\b|\btrayectoria|\bquien dirige/],
  ['FAQ-12', /\bseguridad|\bguardias?\b|\bvigilancia/],
  ['FAQ-13', /\bprofesionales|\bequipo\b|\bpersonal\b|\benfermer|\bkinesiolog|\bquien(es)? (trabajan|atienden)/],
  ['FAQ-14', /\bmenus?\b|\bnutricionista|\balimentacion/],
  ['FAQ-15', /\baccesib/],
  ['FAQ-16', /\bcuantas (habitaciones|piezas)/],
];

const GREETING_WORDS = /\b(hola|holi|alo|buenas|buenos|dias|dia|tardes|noches|que tal|como (esta|estas|estan)|estimad[oa]s?|saludos)\b/g;
const INTRODUCTION = /^(hola )?(soy|me llamo|mi nombre es|hablas con|habla con|le habla|te habla)\b/;
const CLOSING = /^(muchas |mil )?(gracias|ok|oka|okey|vale|perfecto|listo|de acuerdo|entendido|genial|super|bueno|ya)( gracias| muchas gracias| perfecto| listo)*$/;

/**
 * Keyword classifier: free, deterministic and conservative. It never writes an
 * answer; it only names an answer id from the closed list or asks to hand over.
 */
function classifyMessage(text) {
  const normalized = normalizeText(text);
  if (!normalized) return { intent: 'derive', motive: MOTIVES.outOfBase };

  const reserved = RESERVED_RULES.find((rule) => rule[1].test(normalized));
  if (reserved) return { intent: 'derive', motive: reserved[0] };

  if (normalized.length > MAX_CLASSIFIABLE_LENGTH) return { intent: 'derive', motive: MOTIVES.outOfBase };

  let matches = FAQ_RULES.filter((rule) => rule[1].test(normalized)).map((rule) => rule[0]);
  // "¿Puedo ir el sábado?" is a visit question whose answer is the weekend one.
  if (matches.includes('FAQ-03')) matches = matches.filter((id) => id !== 'FAQ-02');
  // "¿Cuántas habitaciones tienen?" asks for the count, not the room types.
  if (matches.includes('FAQ-16')) matches = matches.filter((id) => id !== 'FAQ-05');
  if (matches.length === 1) return { intent: 'faq', faqId: matches[0] };
  if (matches.length > 1) return { intent: 'derive', motive: MOTIVES.outOfBase };

  if (CLOSING.test(normalized)) return { intent: 'closing' };
  if (!normalized.replace(GREETING_WORDS, ' ').trim()) return { intent: 'greeting' };
  if (INTRODUCTION.test(normalized) && normalized.length <= 60) return { intent: 'greeting' };

  return { intent: 'derive', motive: MOTIVES.outOfBase };
}

// Same normalization as normalizeNrcText_ in automation/apps-script/AssignLeadId.gs.
function normalizeText(value) {
  return String(value === null || value === undefined ? '' : value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

module.exports = { MOTIVES, classifyMessage, normalizeText };
