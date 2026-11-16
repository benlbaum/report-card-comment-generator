const { test } = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../src/core.cjs');
const original = require('../src/data.json');
const fixture = () => Core.validate({ ...structuredClone(original), className: 'Fifth grade' });

test('preserves all original students and the 16 categories', () => {
  const state = fixture();
  assert.equal(state.students.length, 4);
  assert.equal(state.categoryOrder.length, 16);
  assert.equal(state.students[0].fullName, original.students[0].fullName);
  assert.deepEqual(state.categories, Core.bank(original.categories, original.categoryOrder).categories);
});
test('roster export contains identities only, never teacher work', () => {
  const state = fixture();
  state.students[0].finalComment = 'Private teacher comment';
  state.students[0].selections.Beginning = state.categories.Beginning[0].phrase;
  const payload = Core.roster(state);
  assert.equal(payload.students.length, 3, 'blank placeholders are excluded');
  for (const student of payload.students) assert.deepEqual(Object.keys(student).sort(), ['fullName', 'id', 'prefName', 'pronoun']);
  assert.equal(JSON.stringify(payload).includes('Private teacher comment'), false);
  assert.equal('categories' in payload, false);
});
test('two teachers share a roster with stable IDs and independent comments', () => {
  const first = fixture();
  first.students[0].finalComment = 'Teacher A comment';
  const incoming = Core.validate(Core.roster(first), fixture());
  const second = Core.mergeRoster([], incoming.students);
  assert.equal(second.added, 3);
  assert.equal(second.students[0].id, first.students[0].id);
  second.students[0].finalComment = 'Teacher B comment';
  const repeated = Core.mergeRoster(second.students, incoming.students);
  assert.equal(repeated.added, 0);
  assert.equal(repeated.skipped, 3);
  assert.equal(repeated.students[0].finalComment, 'Teacher B comment');
  assert.equal(first.students[0].finalComment, 'Teacher A comment');
});
test('roster imports strip scores, statuses, comments and choices even from a backup', () => {
  const state = fixture();
  state.students[0].finalComment = 'Teacher A';
  state.students[0].selections.Beginning = state.categories.Beginning[0].phrase;
  const result = Core.mergeRoster([], state.students);
  assert.equal(result.students[0].finalComment, '');
  assert.equal(result.students[0].fluencyScore, '');
  assert.equal(result.students[0].status, 'Not started');
  assert.deepEqual(result.students[0].selections, {});
});
test('distinct stable IDs preserve students with identical names', () => {
  const s = fixture().students[0];
  const result = Core.mergeRoster([{ ...s, id: 'first' }], [{ ...s, id: 'second' }]);
  assert.equal(result.added, 1);
  assert.equal(result.students.length, 2);
});
test('roster import uses incoming students even when fallback is a complete class state', () => {
  const fallback = fixture();
  const payload = { version: 2, kind: 'roster', className: 'Other class', students: [{ id: 'other', fullName: 'Other Student' }] };
  const imported = Core.validate(payload, fallback);
  assert.equal(imported.students.length, 1);
  assert.equal(imported.students[0].fullName, 'Other Student');
  assert.equal(imported.className, 'Other class');
  assert.deepEqual(imported.categories, fallback.categories);
});
test('a full backup round trip preserves zero scores, choices and final edits', () => {
  const state = fixture();
  state.students[0].fluencyScore = 0;
  state.students[0].selections.Fluency = state.categories.Fluency[1].phrase;
  state.students[0].finalComment = 'Final edit\nwith another line';
  const restored = Core.validate(JSON.parse(JSON.stringify(Core.backup(state))));
  assert.deepEqual(restored.students, state.students);
  assert.deepEqual(restored.categoryOrder, state.categoryOrder);
  assert.equal(restored.className, state.className);
  assert.match(Core.draft(restored.students[0], restored), /0%/);
});
test('old version 1 exports remain compatible, including indexed selections', () => {
  const payload = structuredClone(original);
  payload.version = 1;
  payload.students[0].selections = { Beginning: 0, Responsibility: '1' };
  const state = Core.validate(payload);
  assert.equal(state.students[0].selections.Beginning, state.categories.Beginning[0].phrase);
  assert.equal(state.students[0].selections.Responsibility, state.categories.Responsibility[1].phrase);
  assert.equal(Core.validate(payload).students[0].id, state.students[0].id);
});
test('incomplete or duplicated category order is repaired without dropping categories', () => {
  const payload = structuredClone(original);
  payload.categoryOrder = ['Beginning', 'Beginning', 'Not a category'];
  const state = Core.validate(payload);
  assert.equal(state.categoryOrder.length, 16);
  assert.equal(state.categoryOrder[0], 'Beginning');
});
test('malformed and unsupported files are rejected before mutation', () => {
  for (const invalid of [null, [], {}, { students: ['bad'] }, { version: 99, students: [] }, { kind: 'unknown', students: [] }, { students: [{ fullName: 'A', fluencyScore: 101 }] }, { students: [], categories: { Bad: 'text' } }]) {
    assert.throws(() => Core.validate(invalid, fixture()));
  }
  const state = fixture();
  assert.throws(() => Core.validate({ students: [state.students[0], state.students[0]] }, state), /duplicate student IDs/);
  assert.throws(() => Core.bank(JSON.parse('{"__proto__":[]}')), /category name/);
});
test('empty roster and class backup are valid and safe', () => {
  const state = fixture();
  state.students = [];
  assert.deepEqual(Core.validate(Core.backup(state)).students, []);
  assert.equal(Core.mergeRoster(fixture().students, []).added, 0);
});
test('drafts follow category order, skip blanks and personalize every token', () => {
  const state = fixture();
  const s = state.students[0];
  s.selections.Ending = state.categories.Ending[0].phrase;
  s.selections.Beginning = state.categories.Beginning[0].phrase;
  assert.equal(Core.draft(s, state), Core.personalize(s.selections.Beginning, s) + ' ' + Core.personalize(s.selections.Ending, s));
  assert.equal(Core.personalize('[FullName] [PrefName] [HeShe] [HeSheThey] [HisHerTheir] [HimHerThem] [Score]', s), 'Addyson Martinez Addy She She her her 60');
  s.prefName = '$& [Score]';
  assert.equal(Core.personalize('[PrefName]', s), '$& [Score]', 'names must not act as replacement syntax');
});
test('missing scores remain visibly unresolved and zero is valid', () => {
  const s = fixture().students[0];
  s.selections = { Fluency: '[PrefName] scored [Score]%.' };
  s.fluencyScore = '';
  assert.equal(Core.needsScore(s), true);
  assert.match(Core.personalize(s.selections.Fluency, s), /\[Value\]/);
  s.fluencyScore = 0;
  assert.equal(Core.needsScore(s), false);
});
test('generate all uses each student’s choices and preserves existing final work', () => {
  const state = fixture();
  for (const s of state.students) s.selections.Beginning = state.categories.Beginning[0].phrase;
  state.students[0].finalComment = 'Teacher’s carefully edited final';
  state.students[1].selections.Fluency = state.categories.Fluency[1].phrase;
  state.students[1].fluencyScore = '';
  const result = Core.generateAll(state);
  assert.deepEqual(result, { generated: 1, existing: 1, incomplete: 2 });
  assert.equal(state.students[0].finalComment, 'Teacher’s carefully edited final');
  assert.equal(state.students[1].finalComment, '');
  assert.match(state.students[2].finalComment, /^Jordan Lee /);
  assert.equal(state.students[2].status, 'Draft');
});
test('legacy fluency becomes a configurable value topic without losing old phrases or selections', () => {
  const raw = structuredClone(original);
  raw.students[0].selections = {Fluency:1};
  const state = Core.validate(raw);
  assert.equal(state.topicSettings.Fluency.type, 'value');
  assert.equal(state.topicSettings.Fluency.unit, '%');
  assert.equal(Core.topicValue(state.students[0], 'Fluency'), 60);
  assert.deepEqual(state.categories.Fluency, Core.bank(original.categories, original.categoryOrder).categories.Fluency);
  assert.match(Core.draft(state.students[0], state), /60%/);
});
test('independent number and text entries survive backups and stay out of shared rosters', () => {
  const state = fixture();
  state.categories.Reading = [];
  state.categories.Project = [];
  state.categoryOrder.push('Reading', 'Project');
  state.topicSettings.Reading = {type:'value', valueLabel:'Reading', valueType:'number', unit:'words/min', min:0, max:500, phrase:'[HeShe] reads [Value] words per minute.'};
  state.topicSettings.Project = {type:'value', valueLabel:'Project', valueType:'text', unit:'', min:'', max:'', phrase:'[PrefName] completed [value].'};
  const s = state.students[0];
  s.values = {Reading:0, Project:'a solar system model'};
  s.selections = {Reading:state.topicSettings.Reading.phrase, Project:state.topicSettings.Project.phrase};
  const restored = Core.validate(Core.backup(state));
  assert.deepEqual(restored.topicSettings, Core.bank(state.categories,state.categoryOrder,state.topicSettings).topicSettings);
  assert.match(Core.draft(restored.students[0], restored), /She reads 0 words per minute\. Addy completed a solar system model\./);
  assert.equal('values' in Core.roster(state).students[0], false);
  assert.deepEqual(Core.mergeRoster([], state.students).students[0].values, {});
  s.values.Reading = 501;
  assert.equal(Core.needsScore(s, state), true);
  assert.equal(Core.generateAll(state).generated, 0);
});
test('pronoun presets and custom X/Y forms are retained and personalize subject and object tokens', () => {
  for (const [pronoun, expected] of [['They/Them','They have 80; their; them'], ['He/Him','He has 80; his; him'], ['Ze/Hir','Ze has 80; hir; hir'], ['Ey/Em','Ey has 80; ems; em']]) {
    const s = Core.student({fullName:'Student', pronoun});
    assert.equal(s.pronoun, pronoun);
    assert.equal(Core.personalize('[HeShe] has [Value]; [HisHerTheir]; [HimHerThem]', s, 80), expected);
    assert.equal(Core.validPronouns(pronoun), true);
  }
  assert.equal(Core.validPronouns('custom'), false);
  assert.equal(Core.validPronouns('X/Y/Z'), false);
  const they = Core.student({fullName:'Taylor', pronoun:'They/Them'});
  assert.equal(Core.personalize('[HeShe] generally uses class time well and follows directions.', they), 'They generally use class time well and follow directions.');
  assert.equal(Core.personalize('[HeShe] independently demonstrates understanding.', they), 'They independently demonstrate understanding.');
});
test('invalid configurable value bounds are rejected before replacing bank data', () => {
  assert.throws(() => Core.bank({Rate:[]}, ['Rate'], {Rate:{type:'value', min:100, max:0}}), /minimum and maximum/);
  assert.throws(() => Core.bank({Rate:[]}, ['Rate'], {Rate:{type:'value', min:'bad'}}), /minimum and maximum/);
});
test('bank-only exports round trip definitions and order without any class or student work', () => {
  const state = fixture();
  state.students[0].finalComment = 'Private comment';
  state.students[0].values.Fluency = 75;
  state.categoryOrder.reverse();
  state.categories.Beginning.reverse();
  state.topicSettings.Beginning.type = 'selection';
  const exported = Core.exportBank(state);
  assert.equal(exported.kind, 'phrase-bank');
  assert.deepEqual(Object.keys(exported).sort(), ['categories','categoryOrder','exportedAt','kind','topicSettings','version']);
  assert.equal(JSON.stringify(exported).includes('Private comment'), false);
  assert.equal(JSON.stringify(exported).includes(state.students[0].fullName), false);
  const restored = Core.bankFile(JSON.parse(JSON.stringify(exported)));
  assert.deepEqual(restored.categories, state.categories);
  assert.deepEqual(restored.categoryOrder, state.categoryOrder);
  assert.deepEqual(restored.topicSettings, Core.bank(state.categories,state.categoryOrder,state.topicSettings).topicSettings);
  assert.deepEqual(Core.bankFile(Core.backup(state)), restored);
});
test('bank imports validate files and normalize older selection types', () => {
  for (const type of ['phrases', 'dropdown']) {
    const b = Core.bankFile({categories:{Effort:[{phrase:'[PrefName] tries.'}]}, topicSettings:{Effort:{type}}});
    assert.equal(b.topicSettings.Effort.type, 'selection');
  }
  for (const payload of [null, {}, {version:99,categories:{}}, {kind:'roster',categories:{}}, {categories:{Bad:'bad'}}, {categories:{Rate:[]},topicSettings:{Rate:{type:'value',phrases:[]}}}]) assert.throws(()=>Core.bankFile(payload));
});
test('configured units accompany values exactly once without altering stored numbers', () => {
  const s = fixture().students[0];
  assert.equal(Core.personalize('[HeShe] scored [Value].', s, 80, '%'), 'She scored 80%.');
  assert.equal(Core.personalize('[HeShe] scored [Value]%.', s, 80, '%'), 'She scored 80%.');
  assert.equal(Core.personalize('[PrefName] reads [Value].', s, 120, 'words/min'), 'Addy reads 120 words/min.');
  assert.equal(Core.personalize('[PrefName] reads [Value] words per minute.', s, 120, 'words/min'), 'Addy reads 120 words per minute.');
  assert.equal(Core.personalize('[PrefName] measured [Value] more than before.', s, 2, 'm'), 'Addy measured 2 m more than before.');
});

test('the starting bank matches Kelly’s supplied topics and wording with canonical Value tokens', () => {
  const raw = require('./fixtures/kelly-phrase-bank.json');
  const defaults = require('../src/default-bank.json');
  assert.deepEqual(defaults, Core.bankFile(raw));
  assert.equal(defaults.categoryOrder.length, 14);
  assert.equal(defaults.categoryOrder[0], 'Beginning');
  assert.equal(defaults.categoryOrder.at(-1), 'Ending');
  assert.equal(defaults.topicSettings['Fact Fluency'].type, 'selection');
  assert.match(defaults.categories.Beginning[0].phrase, /excellent first trimester/);
  assert.equal(JSON.stringify(defaults).includes('[Score]'), false);
  assert.equal(defaults.categories.Collaboration[1].phrase.startsWith('[HeShe] regularly'), true);
});
test('multiple value phrases and per-student choices survive bank and class transfers', () => {
  const state = fixture();
  state.categories.Math = [];
  state.categoryOrder.push('Math');
  state.topicSettings.Math = {type:'value',valueType:'number',unit:'%',min:0,max:100,phrases:[{phrase:'[HeShe] needs division help at [Score]%.'},{phrase:'[HeShe] needs multiplication help at [Value].'}]};
  state.students[0].values.Math = 50;
  state.students[0].selections = {Math:state.topicSettings.Math.phrases[0].phrase};
  state.students[1].values.Math = 0;
  state.students[1].selections = {Math:state.topicSettings.Math.phrases[1].phrase};
  const restored = Core.validate(Core.backup(state));
  assert.match(Core.draft(restored.students[0], restored), /division help at 50%/);
  assert.match(Core.draft(restored.students[1], restored), /multiplication help at 0%/);
  assert.equal(restored.students[0].selections.Math.includes('[Value]'), true);
  assert.equal(restored.topicSettings.Math.phrase, restored.topicSettings.Math.phrases[0].phrase);
  assert.deepEqual(Core.bankFile(Core.exportBank(restored)).topicSettings.Math, restored.topicSettings.Math);
});
test('Value Entry allows matching phrases without a token and still requires a valid entry', () => {
  const state = fixture();
  const bank = Core.bankFile({categories:{Math:[]},topicSettings:{Math:{type:'value',unit:'%',min:0,max:100,phrases:[{phrase:'[HeShe] needs help in division.'},{phrase:'[HeShe] needs help in multiplication.'}]}}});
  Object.assign(state, bank);
  const s = state.students[0];
  s.selections = {Math:bank.topicSettings.Math.phrases[1].phrase};
  assert.equal(Core.needsValue(s,state), true);
  s.values.Math = 0;
  assert.equal(Core.needsValue(s,state), false);
  assert.match(Core.draft(s,state), /She needs help in multiplication/);
  s.values.Math = 101;
  assert.equal(Core.needsValue(s,state), true);
  assert.throws(() => Core.bankFile({categories:{Math:[]},topicSettings:{Math:{type:'value',phrases:[{phrase:' '}]}}}), /matching phrase text/);
  assert.equal(Core.personalize('[HeShe] achieved [Value]%.',s,'50%','%'), 'She achieved 50%.');
});
