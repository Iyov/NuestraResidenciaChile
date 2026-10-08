/**
 * Reads the answer base from the SPEC-002 annex so the approved wording has a
 * single source. Only rows whose state starts with "aprobada" may be sent.
 */
function loadKnowledge(sourcePath) {
  // Required here so parseKnowledge stays usable where there is no file system (the hosted worker).
  const fs = require('node:fs');
  const path = require('node:path');
  const source = sourcePath || path.join(__dirname, '..', '..', 'specs', '002-faq-base.md');
  return parseKnowledge(fs.readFileSync(source, 'utf8'));
}

function parseKnowledge(markdown) {
  const entries = new Map();

  markdown.split(/\r?\n/).forEach((line) => {
    const match = /^\|\s*((FAQ|MSG)-\d+)\s*\|/.exec(line);
    if (!match) return;

    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const id = match[1];
    // FAQ rows: ID, consulta, respuesta, fuente, dueño, estado. MSG rows: ID, cuándo, texto, estado.
    const text = cells[2];
    const state = cells[cells.length - 1];
    if (entries.has(id)) throw new Error('Duplicate answer id in the answer base: ' + id);
    entries.set(id, { id, text, approved: /^aprobada\b/i.test(state) });
  });

  if (!entries.size) throw new Error('The answer base has no FAQ or MSG rows.');

  return {
    approvedText(id) {
      const entry = entries.get(id);
      return entry && entry.approved ? entry.text : null;
    },
    isApproved(id) {
      const entry = entries.get(id);
      return Boolean(entry && entry.approved);
    },
    ids() {
      return Array.from(entries.keys());
    },
  };
}

module.exports = { loadKnowledge, parseKnowledge };
