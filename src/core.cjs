/* Pure data functions, shared by the standalone app and its tests. */
const Core = (() => {
  const statuses = ['Not started', 'Draft', 'Done'];
  const pronouns = ['She/Her', 'He/Him', 'They/Them', 'She/They', 'He/They', 'Ze/Hir', 'Xe/Xem'];
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const text = (value, max = 20000) => typeof value === 'string' ? value.slice(0, max) : '';
  const validPronouns = value => typeof value === 'string' && /^[\p{L}][\p{L}'’-]{0,28}\/[\p{L}][\p{L}'’-]{0,28}$/u.test(value.trim());
  const identity = s => [s.fullName, s.prefName, s.pronoun].map(v => String(v || '').trim().toLowerCase()).join('|');
  const legacyId = s => {
    let hash = 2166136261;
    for (const c of identity(s) + '|' + (s.row ?? '')) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
    return 'legacy-' + (hash >>> 0).toString(16);
  };
  function student(raw) {
    if (!object(raw) || typeof raw.fullName !== 'string') throw new Error('Each student needs a fullName text field.');
    const score = raw.fluencyScore;
    if (score !== '' && score != null && (!Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 100)) {
      throw new Error('Fluency scores must be between 0 and 100.');
    }
    const selections = object(raw.selections)
      ? Object.fromEntries(Object.entries(raw.selections).filter(([,v]) => typeof v === 'string' || Number.isInteger(v))) : {};
    return {
      id: text(raw.id, 200) || legacyId(raw), fullName: text(raw.fullName, 200).trim(),
      prefName: text(raw.prefName, 200).trim(), pronoun: validPronouns(raw.pronoun) ? raw.pronoun.trim() : 'She/Her',
      fluencyScore: score === '' || score == null ? '' : Number(score),
      status: statuses.includes(raw.status) ? raw.status : 'Not started',
      finalComment: text(raw.finalComment), selections,
      values: object(raw.values) ? Object.fromEntries(Object.entries(raw.values).filter(([key, value]) => !['__proto__', 'constructor', 'prototype'].includes(key) && (typeof value === 'string' || typeof value === 'number' && Number.isFinite(value))).map(([key,value]) => [key, typeof value === 'string' ? value.slice(0, 300) : value])) : {}
    };
  }
  function bank(raw, order, settings = {}) {
    settings = object(settings) ? settings : {};
    if (!object(raw) || Object.keys(raw).length > 100) throw new Error('The phrase bank must contain at most 100 categories.');
    const entries = Object.entries(raw).map(([cat, opts]) => {
      if (!cat.trim() || cat.length > 100 || ['__proto__', 'constructor', 'prototype'].includes(cat)) throw new Error('That category name cannot be used.');
      if (!Array.isArray(opts) || opts.length > 100) throw new Error('Each category must contain a list of at most 100 phrases.');
      return [cat, opts.map(opt => {
        if (!object(opt) || typeof opt.phrase !== 'string' || opt.phrase.length > 10000) throw new Error('Each phrase needs a valid phrase text field.');
        return { label: text(opt.label, 300), phrase: opt.phrase };
      })];
    });
    const categories = Object.fromEntries(entries);
    const categoryOrder = [...new Set([...(Array.isArray(order) ? order.filter(c => typeof c === 'string' && own(categories, c)) : []), ...Object.keys(categories)])];
    const topicSettings = Object.fromEntries(categoryOrder.map(cat => {
      const config = object(settings) && own(settings, cat) && object(settings[cat]) ? settings[cat] : {};
      const legacyFluency = cat === 'Fluency' && !own(settings, cat);
      const min = config.min === '' || config.min == null ? '' : Number(config.min);
      const max = config.max === '' || config.max == null ? '' : Number(config.max);
      if (min !== '' && !Number.isFinite(min) || max !== '' && !Number.isFinite(max) || min !== '' && max !== '' && min > max) throw new Error('Enter valid minimum and maximum values.');
      return [cat, {
        type: config.type === 'value' || legacyFluency ? 'value' : 'selection',
        valueLabel: cat,
        valueType: config.valueType === 'text' ? 'text' : 'number',
        unit: text(config.unit, 30) || (legacyFluency ? '%' : ''),
        min: legacyFluency ? 0 : min, max: legacyFluency ? 100 : max,
        phrase: text(config.phrase, 10000) || (legacyFluency ? '[HeShe] has a Fluency score of [Value]%.' : '[PrefName] has a value of [Value].')
      }];
    }));
    return { categories, categoryOrder, topicSettings };
  }
  function validate(payload, fallbackBank) {
    if (!object(payload) || !Array.isArray(payload.students)) throw new Error('Choose a roster or class backup JSON file exported from this app.');
    if (payload.version != null && ![1, 2].includes(payload.version)) throw new Error('This file uses an unsupported version.');
    if (payload.kind != null && !['roster', 'backup'].includes(payload.kind)) throw new Error('This is not a supported roster or backup file.');
    if (payload.students.length > 2000) throw new Error('A class file can contain up to 2,000 students.');
    const students = payload.students.map(student);
    if (new Set(students.map(s => s.id)).size !== students.length) throw new Error('This file has duplicate student IDs. Export a fresh copy of the class.');
    const isRoster = payload.kind === 'roster';
    const fallback = fallbackBank ? bank(fallbackBank.categories, fallbackBank.categoryOrder, fallbackBank.topicSettings) : undefined;
    const b = isRoster ? fallback : payload.categories ? bank(payload.categories, payload.categoryOrder, payload.topicSettings) : fallback;
    if (!b) throw new Error('This file does not include a phrase bank.');
    for (const s of students) {
      s.selections = Object.fromEntries(Object.entries(s.selections).flatMap(([cat, selected]) => {
        const opts = own(b.categories, cat) ? b.categories[cat] : [];
        const phrase = typeof selected === 'number' || /^\d+$/.test(selected) ? opts[Number(selected)]?.phrase : selected;
        return opts.some(o => o.phrase === phrase) || b.topicSettings[cat]?.type === 'value' && phrase === b.topicSettings[cat].phrase ? [[cat, phrase]] : [];
      }));
    }
    return { kind: isRoster ? 'roster' : 'backup', className: text(payload.className, 100) || 'My class', students, ...b };
  }
  function personalize(phrase, s, value = s.fluencyScore, unit = '') {
    const full = s.fullName.trim() || 'Student';
    const [subject, rawObject] = s.pronoun.toLowerCase().split('/');
    const objectPronoun = rawObject === 'they' && ['she', 'he'].includes(subject) ? (subject === 'she' ? 'her' : 'him') : rawObject;
    const possessive = {her:'her', him:'his', them:'their', they:'their', hir:'hir', xem:'xyr'}[objectPronoun] || objectPronoun + 's';
    const capital = subject[0].toUpperCase() + subject.slice(1);
    if (subject === 'they') {
      const verbs = {has:'have', is:'are', was:'were', does:'do', demonstrates:'demonstrate', shows:'show', struggles:'struggle', communicates:'communicate', contributes:'contribute', prefers:'prefer', needs:'need', uses:'use', follows:'follow', requires:'require', manages:'manage', participates:'participate', benefits:'benefit', reads:'read', writes:'write', scores:'score', works:'work', completes:'complete', tries:'try', applies:'apply'};
      const verbPattern = Object.keys(verbs).join('|');
      const adverbs = '(?:(?:[a-z]+ly|always|sometimes|often|still|also|not)\\s+)*';
      phrase = phrase.replace(/(\[(?:HeShe|HeSheThey|he\/she)\])([^.!?]*)/g, (_, token, clause) => {
        clause = clause.replace(new RegExp('^(\\s+' + adverbs + ')(' + verbPattern + ')\\b'), (_, prefix, verb) => prefix + verbs[verb]);
        clause = clause.replace(new RegExp('(\\band\\s+' + adverbs + ')(' + verbPattern + ')\\b', 'g'), (_, prefix, verb) => prefix + verbs[verb]);
        return token + clause;
      });
    }
    const tokens = {
      FullName: full, PrefName: s.prefName.trim() || full, HeShe: capital,
      HeSheThey: capital, HisHerTheir: possessive, HimHerThem: objectPronoun,
      'he/she': subject, Value: value === '' || value == null ? '[Value]' : String(value),
      value: value === '' || value == null ? '[value]' : String(value),
      Score: value === '' || value == null ? '[Score]' : String(value)
    };
    return phrase.replace(/\[(FullName|PrefName|HeShe|HeSheThey|HisHerTheir|HimHerThem|Score|Value|value|he\/she)\]/g, (match, token, offset) => {
      if (!['Score', 'Value', 'value'].includes(token) || value === '' || value == null || !unit) return tokens[token];
      const after = phrase.slice(offset + match.length).trimStart().toLowerCase();
      const normalized = unit.trim().toLowerCase();
      const exactUnit = after.startsWith(normalized) && (!/[\p{L}\p{N}]$/u.test(normalized) || !/^[\p{L}\p{N}]/u.test(after.slice(normalized.length)));
      const alreadyPresent = exactUnit || normalized === '%' && /^(percent\b|per cent\b)/.test(after) || ['wpm', 'words/min'].includes(normalized) && /^(words? per minute\b|words?\/min\b|wpm\b)/.test(after);
      return alreadyPresent ? String(value) : String(value) + (/^[%°]/.test(unit) ? '' : ' ') + unit;
    });
  }
  const topicValue = (s, cat) => own(s.values || {}, cat) ? s.values[cat] : cat === 'Fluency' ? s.fluencyScore : '';
  function valueError(value, config = {}) {
    if (value === '' || value == null || config.valueType === 'text') return '';
    if (!Number.isFinite(Number(value))) return 'Enter a number.';
    if (config.min !== '' && Number(value) < config.min) return `Enter ${config.min} or more.`;
    if (config.max !== '' && Number(value) > config.max) return `Enter ${config.max} or less.`;
    return '';
  }
  function topicSentence(s, state, cat) {
    const phrase = own(s.selections, cat) ? s.selections[cat] : '';
    const config = state.topicSettings?.[cat];
    if (!state.categories[cat]?.some(o => o.phrase === phrase) && !(config?.type === 'value' && phrase === config.phrase)) return '';
    return personalize(phrase, s, topicValue(s, cat), config?.unit);
  }
  function draft(s, state) {
    return state.categoryOrder.flatMap(cat => {
      const sentence = topicSentence(s, state, cat);
      return sentence ? [sentence] : [];
    }).join(' ');
  }
  function needsScore(s, state) { return Object.entries(s.selections).some(([cat, p]) => /\[(Score|Value|value)\]/.test(p) && (topicValue(s, cat) === '' || !!(state && valueError(topicValue(s, cat), state.topicSettings[cat])))); }
  function roster(state) {
    return {
      version: 2, kind: 'roster', className: state.className, exportedAt: new Date().toISOString(),
      students: state.students.filter(s => s.fullName.trim()).map(({id, fullName, prefName, pronoun}) => ({ id, fullName, prefName, pronoun }))
    };
  }
  function backup(state) { return { ...state, version: 2, kind: 'backup', exportedAt: new Date().toISOString() }; }
  function bankFile(payload) {
    if (!object(payload) || !object(payload.categories)) throw new Error('Choose a phrase bank file or a class backup containing a bank.');
    if (payload.version != null && ![1, 2].includes(payload.version)) throw new Error('This bank file uses an unsupported version.');
    if (payload.kind != null && !['phrase-bank', 'backup'].includes(payload.kind)) throw new Error('Choose a phrase bank file or a class backup.');
    const result = bank(payload.categories, payload.categoryOrder, payload.topicSettings);
    if (new Set(result.categoryOrder.map(cat => cat.toLowerCase())).size !== result.categoryOrder.length) throw new Error('Each topic needs a unique name, including capitalization.');
    for (const cat of result.categoryOrder) {
      if (result.topicSettings[cat].type === 'value' && !/\[(Value|value|Score)\]/.test(result.topicSettings[cat].phrase)) throw new Error(`Add [Value] to the matching phrase for ${cat}.`);
    }
    return result;
  }
  function exportBank(state) {
    return { version: 2, kind: 'phrase-bank', exportedAt: new Date().toISOString(), ...bankFile(state) };
  }
  function mergeRoster(current, incoming) {
    const result = current.slice();
    let added = 0;
    for (const s of incoming) {
      if (!s.fullName.trim()) continue;
      const match = result.some(existing => existing.id === s.id ||
        ((existing.id.startsWith('legacy-') || s.id.startsWith('legacy-')) && identity(existing) === identity(s)));
      if (!match) {
        result.push({ ...s, fluencyScore: '', values: {}, status: 'Not started', finalComment: '', selections: {} });
        added++;
      }
    }
    return { students: result, added, skipped: incoming.filter(s => s.fullName.trim()).length - added };
  }
  function generateAll(state) {
    let generated = 0, existing = 0, incomplete = 0;
    for (const s of state.students) {
      if (s.finalComment.trim()) { existing++; continue; }
      const comment = draft(s, state);
      if (!s.fullName.trim() || !comment || needsScore(s, state)) { incomplete++; continue; }
      s.finalComment = comment;
      s.status = 'Draft';
      generated++;
    }
    return { generated, existing, incomplete };
  }
  return { student, bank, validate, personalize, draft, needsScore, roster, backup, mergeRoster, generateAll, topicValue, topicSentence, valueError, pronouns, validPronouns, bankFile, exportBank };
})();
if (typeof module !== 'undefined') module.exports = Core;
