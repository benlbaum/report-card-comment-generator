const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const STORAGE_KEY = 'report-card-comment-builder-v2';
const clone = value => JSON.parse(JSON.stringify(value));
let startupMessage = '';
let storageAvailable = true;
let state = Core.validate({ ...INITIAL_DATA, className: 'My class' });
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) state = Core.validate(JSON.parse(saved), state);
} catch {
  startupMessage = 'Saved work could not be loaded. Import a class backup from Class overview.';
}
let currentId = state.students[0]?.id;
let view = 'write';
let helpReturnView = 'write';
let activeCategory = state.categoryOrder[0];
let overviewCategory = 'Final comments';
let bankCategory = state.categoryOrder[0];
let bankDraft = clone({ categories: state.categories, categoryOrder: state.categoryOrder, topicSettings: state.topicSettings });
let bankDirty = false;
let undoState = null;
let undoTimer;
let toastTimer;
let pendingImport = null;
let pendingRosterImport = null;
let pendingBankImport = null;
let bankImportFilename = '';
let bankEditing = false;
let bankDrag = null;
const reorderGrip = '<svg aria-hidden="true" width="20" height="24" viewBox="0 0 20 24" fill="currentColor"><circle cx="6" cy="6" r="1.5"/><circle cx="14" cy="6" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="14" cy="12" r="1.5"/><circle cx="6" cy="18" r="1.5"/><circle cx="14" cy="18" r="1.5"/></svg>';
const current = () => state.students.find(s => s.id === currentId);
const displayName = s => s.fullName || 'New student';

function newStudent() {
  return { id: crypto.randomUUID(), fullName: '', prefName: '', pronoun: 'She/Her', fluencyScore: '', values: {}, status: 'Not started', finalComment: '', selections: {} };
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageAvailable = true;
    $('saveStatus').textContent = 'Student work saved automatically';
    $('saveStatus').closest('details').classList.remove('storage-error');
  } catch {
    storageAvailable = false;
    $('saveStatus').textContent = 'Work is not saved — export a class backup';
    $('saveStatus').closest('details').classList.add('storage-error');
    $('saveStatus').closest('details').open = true;
  }
  $('classCount').textContent = state.students.length;
  $('rosterExport').disabled = !state.students.some(s => s.fullName.trim());
  return storageAvailable;
}
function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5500);
}
function snapshot(message) {
  undoState = clone(state);
  $('undoText').textContent = message;
  $('undoNotice').hidden = false;
  scheduleUndoNotice();
}
function scheduleUndoNotice() {
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { $('undoNotice').hidden = true; }, 6000);
}
function confirmAction(title, message, label) {
  $('confirmHeading').textContent = title;
  $('confirmMessage').textContent = message;
  $('acceptConfirm').textContent = label;
  return new Promise(resolve => {
    const dialog = $('confirmDialog');
    dialog.returnValue = 'cancel';
    dialog.onclose = () => { dialog.onclose = null; resolve(dialog.returnValue === 'accept'); };
    $('acceptConfirm').onclick = () => dialog.close('accept');
    $('cancelConfirm').onclick = () => dialog.close('cancel');
    dialog.showModal();
    $('cancelConfirm').focus();
  });
}
function setView(next) {
  view = next;
  for (const name of ['write', 'overview', 'roster', 'bank', 'help']) $(name + 'View').hidden = name !== view;
  if (view === 'help') $('openHelp').setAttribute('aria-current', 'page');
  else $('openHelp').removeAttribute('aria-current');
  document.querySelectorAll('[data-view]').forEach(button => {
    const selected = button.dataset.view === view;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  if (view === 'write') renderWrite();
  if (view === 'overview') renderOverview();
  if (view === 'roster') renderRoster();
  if (view === 'bank') renderBank();
}
function renderStudentPicker() {
  $('studentSelect').innerHTML = '<button><selectedcontent></selectedcontent></button>' + state.students.map(s => `<option value="${escapeHTML(s.id)}">${escapeHTML(displayName(s))}</option>`).join('');
  $('studentSelect').value = currentId || '';
  const index = state.students.findIndex(s => s.id === currentId);
  $('studentPosition').textContent = state.students.length ? `${index + 1} / ${state.students.length}` : 'No students';
  $('studentSelect').disabled = !state.students.length;
  $('prevStudent').disabled = index <= 0;
  $('nextStudent').disabled = index < 0 || index === state.students.length - 1;
}
function renderWrite() {
  if (!current() && state.students.length) currentId = state.students[0].id;
  renderStudentPicker();
  const s = current();
  $('finalText').disabled = !s;
  $('finalText').value = s?.finalComment || '';
  $('writeHeading').textContent = s?.fullName ? `${s.prefName || s.fullName.split(' ')[0]}’s comment` : 'Comment';
  if (!state.categoryOrder.includes(activeCategory)) activeCategory = state.categoryOrder[0];
  renderCategory();
  updatePreview();
}
function phraseOptions(category, selected) {
  return `<option value="">Skip this topic</option>` + topicPhrases(category).map((opt, i) =>
    `<option value="${i}" ${opt.phrase === selected ? 'selected' : ''}>${escapeHTML(`Option ${i + 1}: ${opt.phrase.replace(/\[[^\]]+\]/g, '…')}`)}</option>`).join('');
}
function topicPhrases(cat) { return state.topicSettings[cat]?.type === 'value' ? Core.valuePhrases(state.topicSettings[cat]) : state.categories[cat] || []; }
function valueLabel(topic, config) { return topic + (config.unit ? ` (${config.unit})` : ''); }
function valueInput(s, cat, id, extra = '') {
  const config = state.topicSettings[cat];
  const value = config.type === 'value' && !s.selections[cat] ? '' : Core.topicValue(s, cat);
  const error = Core.valueError(value, config);
  const input = `<input id="${escapeHTML(id)}" ${extra} type="${config.valueType === 'text' ? 'text' : 'number'}" ${config.valueType === 'text' ? 'maxlength="300"' : `step="any" ${config.min !== '' ? `min="${config.min}"` : ''} ${config.max !== '' ? `max="${config.max}"` : ''}`} value="${escapeHTML(value)}" ${error ? 'aria-invalid="true"' : ''}>`;
  return config.unit ? `<div class="value-input-wrap">${input}<span class="value-unit" aria-hidden="true">${escapeHTML(config.unit)}</span></div>` : input;
}
function setTopicValue(s, cat, input) {
  const config = state.topicSettings[cat];
  const value = input.value;
  s.values ||= {};
  s.values[cat] = value === '' ? '' : config.valueType === 'number' && Number.isFinite(Number(value)) ? Number(value) : value;
  if (config.type === 'value') {
    if (value === '') delete s.selections[cat];
    else if (!Core.valuePhrases(config).some(opt => opt.phrase === s.selections[cat])) s.selections[cat] = Core.valuePhrases(config)[0]?.phrase;
  }
  const error = input.validity.badInput ? 'Enter a number.' : Core.valueError(s.values[cat], config);
  input.setAttribute('aria-invalid', String(!!error));
  if (s.status === 'Not started' && Object.keys(s.selections).length) s.status = 'Draft';
  save();
  return error;
}
function renderCategory() {
  const s = current();
  const panel = $('categoryPanel');
  if (!s) { panel.innerHTML = '<p class="empty-state">Add a student to start building comments.</p>'; return; }
  if (!activeCategory) { panel.innerHTML = '<p class="empty-state">Add a topic in the Phrase bank to start building comments.</p>'; return; }
  const options = topicPhrases(activeCategory);
  const config = state.topicSettings[activeCategory];
  const topics = state.categoryOrder;
  const categoryIndex = state.categoryOrder.indexOf(activeCategory);
  panel.innerHTML = `<div class="topic-picker"><div class="field"><div class="topic-label"><label for="topicSelect">Topic</label><span id="topicPosition" class="muted">${categoryIndex + 1} / ${topics.length}</span></div><select id="topicSelect" title="${escapeHTML(activeCategory)}">${topics.map(cat => `<option ${cat === activeCategory ? 'selected' : ''}>${escapeHTML(cat)}</option>`).join('')}</select></div><button id="previousTopic" class="button" aria-label="Previous topic" ${categoryIndex <= 0 ? 'disabled' : ''}>Previous</button><button id="nextTopic" class="button" aria-label="Next topic" ${categoryIndex >= state.categoryOrder.length - 1 ? 'disabled' : ''}>Next</button></div>
    ${config.type === 'value' ? `<div class="topic-value-entry"><div class="field"><label for="topicValue">${escapeHTML(valueLabel(activeCategory, config))}</label>${valueInput(s, activeCategory, 'topicValue')}</div></div>` : ''}<div class="phrase-options" role="radiogroup" aria-label="${escapeHTML(activeCategory)} phrases">
    ${options.map((opt, i) => `<label class="phrase-option ${s.selections[activeCategory] === opt.phrase ? 'chosen' : ''}"><input type="radio" name="phraseChoice" value="${i}" ${s.selections[activeCategory] === opt.phrase ? 'checked' : ''}><span class="phrase-text">${escapeHTML(Core.personalize(opt.phrase, s, Core.topicValue(s, activeCategory), config.unit))}</span></label>`).join('')}
    <label class="phrase-option ${!s.selections[activeCategory] ? 'chosen' : ''}"><input type="radio" name="phraseChoice" value="" ${!s.selections[activeCategory] ? 'checked' : ''}><span>Skip this topic</span></label></div>
    ${config.type !== 'value' && options.some(o => /\[(Score|Value|value)\]/.test(o.phrase)) ? `<div class="field topic-extra-value"><label for="topicValue">${escapeHTML(valueLabel(activeCategory, config))}</label>${valueInput(s, activeCategory, 'topicValue')}</div>` : ''}
    <p id="valueError" class="inline-warning" role="alert" hidden></p>`;
  $('topicSelect').onchange = event => {
    activeCategory = event.target.value;
    renderCategory();
    updatePreview();
    $('topicSelect').focus();
  };
  const moveTopic = offset => {
    activeCategory = state.categoryOrder[categoryIndex + offset];
    renderCategory();
    updatePreview();
    const button = $(offset > 0 ? 'nextTopic' : 'previousTopic');
    (button.disabled ? $('topicSelect') : button).focus({ preventScroll: true });
  };
  $('previousTopic').onclick = () => moveTopic(-1);
  $('nextTopic').onclick = () => moveTopic(1);
  panel.querySelectorAll('[name="phraseChoice"]').forEach(radio => { radio.onchange = event => choosePhrase(event.target.value); });
  updatePhrasePreviews();
  if ($('topicValue')) $('topicValue').oninput = event => {
    const error = setTopicValue(s, activeCategory, event.target);
    $('valueError').textContent = error;
    $('valueError').hidden = !error;
    updatePreview();
    updatePhrasePreviews();
    if (error) $('useDraft').disabled = true;
  };
}
function choosePhrase(value) {
  const s = current();
  if (!s) return;
  if (value === '') {
    delete s.selections[activeCategory];
    if (state.topicSettings[activeCategory].type === 'value') { s.values[activeCategory] = ''; $('topicValue').value = ''; }
  } else s.selections[activeCategory] = topicPhrases(activeCategory)[Number(value)].phrase;
  if (s.status === 'Not started' && Object.keys(s.selections).length) s.status = 'Draft';
  document.querySelectorAll('[name="phraseChoice"]').forEach(radio => {
    radio.checked = radio.value === value;
    radio.closest('label').classList.toggle('chosen', radio.checked);
  });
  save();
  updatePhrasePreviews();
  updatePreview();
}
function updatePhrasePreviews() {
  if (!current() || !activeCategory) return;
  const options = topicPhrases(activeCategory);
  $('categoryPanel').querySelectorAll('[name="phraseChoice"]').forEach(radio => {
    radio.checked = radio.value === '' ? !current().selections[activeCategory] : options[Number(radio.value)]?.phrase === current().selections[activeCategory];
    radio.closest('label').classList.toggle('chosen', radio.checked);
  });
  $('categoryPanel').querySelectorAll('.phrase-text').forEach((el, i) => { if (options[i]) el.textContent = Core.personalize(options[i].phrase, current(), Core.topicValue(current(), activeCategory), state.topicSettings[activeCategory].unit); });
}
function updatePreview() {
  const s = current();
  const draft = s ? Core.draft(s, state) : '';
  if (draft) {
    $('draftBox').innerHTML = state.categoryOrder.flatMap(cat => {
      const text = Core.topicSentence(s, state, cat);
      if (!text) return [];
      const sentence = escapeHTML(text);
      return [cat === activeCategory ? `<mark>${sentence}</mark>` : sentence];
    }).join(' ');
  } else $('draftBox').textContent = 'Choose a phrase to start.';
  $('draftBox').classList.toggle('empty', !draft);
  $('draftCount').textContent = draft ? characterCount(draft.length) : '';
  $('draftCount').classList.toggle('over-limit', draft.length > 1000);
  const selectedCount = Object.keys(s?.selections || {}).length;
  $('selectionCount').textContent = `${selectedCount} ${selectedCount === 1 ? 'topic' : 'topics'} selected`;
  $('scoreWarning').hidden = !s || !Core.needsValue(s, state);
  $('useDraft').disabled = !draft || Core.needsValue(s, state);
  $('copyFinal').disabled = !s?.finalComment.trim();
  $('clearFinal').disabled = !s?.finalComment;
  $('markDone').disabled = !s?.finalComment.trim() || !s?.fullName.trim();
  const length = s?.finalComment.length || 0;
  $('charCount').textContent = characterCount(length);
  $('charCount').classList.toggle('over-limit', length > 1000);
  $('commentLimitWarning').hidden = length <= 1000;
  $('finalText').setAttribute('aria-describedby', length > 1000 ? 'charCount commentLimitWarning' : 'charCount');
  $('finalText').classList.toggle('over-limit', length > 1000);
  $('studentStatus').textContent = s?.status || 'Not started';
  $('studentStatus').className = 'visually-hidden';
  $('writeHeading').textContent = s?.fullName ? `${s.prefName || s.fullName.split(' ')[0]}’s comment` : 'Comment';
}
function characterCount(length) {
  return `${length.toLocaleString()} / 1,000 characters${length > 1000 ? ` · ${(length - 1000).toLocaleString()} over limit` : ''}`;
}
function moveStudent(offset) {
  const index = state.students.findIndex(s => s.id === currentId);
  const next = state.students[index + offset];
  if (next) { currentId = next.id; renderWrite(); }
}
function renderClassProgress() {
  const done = state.students.filter(s => s.status === 'Done').length;
  const drafts = state.students.filter(s => s.status === 'Draft').length;
  $('classProgress').textContent = `${state.students.length} students · ${done} done · ${drafts} in draft · ${state.students.length - done - drafts} not started`;
}
function removeStudentButton(s) {
  return `<button class="text-button danger remove-student" data-remove-student="${escapeHTML(s.id)}" aria-label="Remove ${escapeHTML(displayName(s))}">Remove</button>`;
}
function bindStudentRemoval() {
  $('rosterList').querySelectorAll('[data-remove-student]').forEach(button => {
    button.onclick = async () => {
      const id = button.dataset.removeStudent;
      const index = state.students.findIndex(s => s.id === id);
      const student = state.students[index];
      if (!student || !await confirmAction(`Remove ${displayName(student)}?`, 'This removes the student and their saved comments and phrase selections. You can undo this change.', 'Remove student')) return;
      snapshot(`Removed ${displayName(student)}.`);
      state.students.splice(index, 1);
      if (currentId === id) currentId = (state.students[index] || state.students[index - 1])?.id;
      save();
      renderWrite();
      renderOverview();
      renderRoster();
      const remaining = $('rosterList').querySelectorAll('[data-remove-student]');
      const next = remaining[Math.min(index, remaining.length - 1)];
      (next || $('addStudent')).focus();
    };
  });
}
function renderOverview() {
  $('overviewHeading').textContent = state.className;
  renderClassProgress();
  const names = ['Final comments', ...state.categoryOrder];
  if (!names.includes(overviewCategory)) overviewCategory = names[0];
  $('overviewTopic').innerHTML = names.map(name => `<option ${name === overviewCategory ? 'selected' : ''}>${escapeHTML(name)}</option>`).join('');
  const status = $('filterStatus').value;
  const students = state.students.filter(s => !status || s.status === status);
  $('overviewList').innerHTML = students.length ? students.map(s => {
    const category = overviewCategory === 'Final comments' ? null : overviewCategory;
    const selection = category ? s.selections[category] : '';
    const comment = category ? Core.topicSentence(s, state, category) : s.finalComment;
    const config = state.topicSettings[category];
    return `<article class="student-row ${category ? 'topic-row' : 'comment-row'}" data-student="${escapeHTML(s.id)}"><h3><button class="student-name" data-open="${escapeHTML(s.id)}" title="${escapeHTML(displayName(s))}" aria-label="Open comment for ${escapeHTML(displayName(s))}">${escapeHTML(displayName(s))}</button></h3><span class="status ${s.status === 'Done' ? 'done' : s.status === 'Draft' ? 'draft' : ''}">${s.status}</span>
      <div class="row-comment">${category ? config.type === 'value' ? `<label class="visually-hidden" for="overview-value-${escapeHTML(s.id)}">${escapeHTML(valueLabel(category, config))} for ${escapeHTML(displayName(s))}</label><div class="overview-value-controls"><label class="visually-hidden" for="overview-choice-${escapeHTML(s.id)}">${escapeHTML(category)} matching phrase for ${escapeHTML(displayName(s))}</label><select id="overview-choice-${escapeHTML(s.id)}" data-choice="${escapeHTML(s.id)}">${phraseOptions(category, selection)}</select>${valueInput(s, category, 'overview-value-' + s.id, `data-overview-value="${escapeHTML(s.id)}"`)}</div>` : `<label class="visually-hidden" for="overview-choice-${escapeHTML(s.id)}">${escapeHTML(category)} phrase for ${escapeHTML(displayName(s))}</label><select id="overview-choice-${escapeHTML(s.id)}" data-choice="${escapeHTML(s.id)}">${phraseOptions(category, selection)}</select>` : `<p class="${comment ? '' : 'muted'}" title="${escapeHTML(comment || 'No final comment yet.')}">${escapeHTML(comment || 'No final comment yet.')}</p>`}</div>
      ${category ? '' : `<button class="button row-copy" data-copy-comment="${escapeHTML(s.id)}" aria-label="Copy comment for ${escapeHTML(displayName(s))}" ${s.finalComment.trim() ? '' : 'disabled'}>Copy</button>`}</article>`;
  }).join('') : `<p class="empty-state">${state.students.length ? 'No students match this progress filter.' : 'No students yet.'}</p>`;
  $('overviewList').querySelectorAll('[data-open]').forEach(button => { button.onclick = () => {
    currentId = button.dataset.open;
    if (overviewCategory !== 'Final comments') activeCategory = overviewCategory;
    setView('write');
    $('finalText').focus();
  }; });
  $('overviewList').querySelectorAll('[data-copy-comment]').forEach(button => { button.onclick = () => {
    copyStudentComment(state.students.find(student => student.id === button.dataset.copyComment));
  }; });
  $('overviewList').querySelectorAll('[data-choice]').forEach(select => { select.onchange = () => {
    const s = state.students.find(item => item.id === select.dataset.choice);
    if (select.value === '') {
      delete s.selections[overviewCategory];
      if (state.topicSettings[overviewCategory].type === 'value') s.values[overviewCategory] = '';
    } else s.selections[overviewCategory] = topicPhrases(overviewCategory)[Number(select.value)].phrase;
    if (s.status === 'Not started' && Object.keys(s.selections).length) s.status = 'Draft';
    save();
    renderOverview();
    $('overviewList').querySelectorAll('[data-choice]').forEach(el => { if (el.dataset.choice === s.id) el.focus(); });
  }; });
  $('overviewList').querySelectorAll('[data-overview-value]').forEach(input => { input.oninput = () => {
    const s = state.students.find(student => student.id === input.dataset.overviewValue);
    const error = setTopicValue(s, overviewCategory, input);
    input.setCustomValidity(error);
    input.title = error;
    const select = input.closest('.row-comment').querySelector('[data-choice]');
    select.value = String(topicPhrases(overviewCategory).findIndex(opt => opt.phrase === s.selections[overviewCategory]));
    if (!s.selections[overviewCategory]) select.value = '';
    renderClassProgress();
  }; });
}
function renderStudentEditor(students) {
  const labels = { fullName: 'Full name', prefName: 'Preferred name', pronoun: 'Pronouns', status: 'Progress' };
  const fields = Object.keys(labels);
  $('rosterList').innerHTML = students.length ? `<table class="student-editor"><caption>Student details</caption><thead><tr>${fields.map(field => `<th scope="col">${labels[field]}</th>`).join('')}<th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead><tbody>${students.map(s => `<tr data-student="${escapeHTML(s.id)}">${fields.map(field => {
    const id = 'student-' + field + '-' + s.id;
    const attributes = `id="${escapeHTML(id)}" data-student="${escapeHTML(s.id)}" data-field="${field}"`;
    const label = `<label class="visually-hidden" for="${escapeHTML(id)}">${labels[field]} for ${escapeHTML(displayName(s))}</label>`;
    if (field === 'pronoun' || field === 'status') {
      const options = field === 'pronoun' ? Core.pronouns : ['Not started', 'Draft', 'Done'];
      const custom = field === 'pronoun' && !options.includes(s.pronoun);
      return `<td>${label}<select ${attributes}>${options.map(option => `<option ${s[field] === option ? 'selected' : ''}>${option}</option>`).join('')}${field === 'pronoun' ? `<option value="custom" ${custom ? 'selected' : ''}>Custom…</option>` : ''}</select>${field === 'pronoun' ? `<div class="custom-pronouns" ${custom ? '' : 'hidden'}><label for="${escapeHTML(id)}-custom" class="visually-hidden">Custom pronouns for ${escapeHTML(displayName(s))} (X/Y)</label><input id="${escapeHTML(id)}-custom" data-custom-pronoun="${escapeHTML(s.id)}" maxlength="59" value="${custom ? escapeHTML(s.pronoun) : ''}" placeholder="X/Y, for example Ey/Em"><span class="pronoun-error" role="status" hidden>Enter pronouns as X/Y.</span></div>` : ''}</td>`;
    }
    return `<td>${label}<input ${attributes} type="text" maxlength="200" autocomplete="off" value="${escapeHTML(s[field])}" ${field === 'prefName' ? 'placeholder="Optional"' : ''}></td>`;
  }).join('')}<td>${removeStudentButton(s)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty-state">No students yet.</p>';
  $('rosterList').insertAdjacentHTML('beforeend', '<button id="addStudentBottom" class="button add-student-bottom" aria-label="Add student to class list" title="Add student"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>');
  $('addStudentBottom').onclick = addStudentToClass;
  $('rosterList').querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
      const s = state.students.find(student => student.id === input.dataset.student);
      const field = input.dataset.field;
      if (field === 'pronoun') {
        const custom = input.parentElement.querySelector('.custom-pronouns');
        custom.hidden = input.value !== 'custom';
        if (input.value === 'custom') { custom.querySelector('input').focus(); return; }
      }
      s[field] = input.value;
      save();
      renderStudentPicker();
      renderClassProgress();
      updatePhrasePreviews();
      updatePreview();
    });
  });
  $('rosterList').querySelectorAll('[data-custom-pronoun]').forEach(input => { input.oninput = () => {
    const valid = Core.validPronouns(input.value);
    input.setAttribute('aria-invalid', String(!valid));
    input.parentElement.querySelector('.pronoun-error').hidden = valid;
    if (!valid) return;
    const s = state.students.find(student => student.id === input.dataset.customPronoun);
    s.pronoun = input.value.trim();
    save();
    updatePhrasePreviews();
    updatePreview();
  }; });
  bindStudentRemoval();
}
function renderRoster() {
  $('className').value = state.className;
  $('rosterSummary').textContent = `${state.students.length} ${state.students.length === 1 ? 'student' : 'students'}`;
  $('rosterSort').value = '';
  $('rosterSort').disabled = state.students.length < 2;
  renderStudentEditor(state.students);
}
function studentSortName(student, by) {
  const name = student.fullName.trim();
  const parts = name.split(/\s+/);
  const comma = name.indexOf(',');
  const first = comma < 0 ? parts[0] : name.slice(comma + 1).trim().split(/\s+/)[0];
  if (by === 'preferred') return student.prefName.trim() || first;
  return by === 'last' ? (comma < 0 ? parts.at(-1) : name.slice(0, comma).trim()) : first;
}
$('rosterSort').onchange = event => {
  const by = event.target.value;
  if (!['first', 'last', 'preferred'].includes(by)) return;
  const collator = new Intl.Collator(undefined, {sensitivity:'base', numeric:true});
  const sorted = [...state.students].sort((a, b) => {
    if (!a.fullName.trim() || !b.fullName.trim()) return Number(!a.fullName.trim()) - Number(!b.fullName.trim());
    return collator.compare(studentSortName(a, by), studentSortName(b, by)) || collator.compare(a.fullName.trim(), b.fullName.trim());
  });
  const label = by === 'preferred' ? 'preferred name' : `${by} name`;
  if (sorted.some((student, index) => student.id !== state.students[index].id)) {
    snapshot(`Students sorted by ${label}.`);
    state.students = sorted;
    save();
    renderRoster();
  } else $('rosterSort').value = '';
  toast(`Students sorted A–Z by ${label}.`);
  $('rosterSort').focus({preventScroll:true});
};
function openStudentEditor() {
  setView('roster');
  const input = [...$('rosterList').querySelectorAll('[data-field="fullName"]')].find(field => field.dataset.student === currentId);
  (input || $('addStudent')).focus();
}
function updateBankStatus() {
  $('bankEditStatus').textContent = bankDirty ? 'Unsaved changes — choose Save bank before leaving' : storageAvailable ? 'Bank saved in this browser' : 'Bank not saved — export a bank or class backup';
  $('bankEditStatus').closest('.bank-save-bar').classList.toggle('has-changes', bankDirty || !storageAvailable);
  const invalidName = !$('bankTopicName').validity.valid;
  $('saveBank').disabled = !bankDirty || invalidName;
  $('exportBank').disabled = invalidName;
  $('discardBank').disabled = !bankDirty;
}
function fitPhraseBox(textarea) {
  if (!textarea.clientWidth) return;
  textarea.style.height = 'auto';
  const style = getComputedStyle(textarea);
  const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  textarea.style.height = Math.ceil(textarea.scrollHeight + border) + 'px';
}
function clearBankDrag() {
  const drag = bankDrag;
  bankDrag = null;
  if (drag?.handle.hasPointerCapture?.(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
  $('bankView').querySelectorAll('.phrase-edit-row, .bank-topic-row').forEach(row => row.classList.remove('dragging', 'drop-before', 'drop-after'));
}
function activeBankPhrases() {
  const config = bankDraft.topicSettings[bankCategory];
  return config.type === 'value' ? config.phrases : bankDraft.categories[bankCategory];
}
function syncValuePhrase() {
  const config = bankDraft.topicSettings[bankCategory];
  if (config.type === 'value') config.phrase = config.phrases[0]?.phrase || '';
}
function movePhrase(from, to) {
  const phrases = activeBankPhrases();
  if (from === to || from < 0 || to < 0 || from >= phrases.length || to >= phrases.length) return;
  const [phrase] = phrases.splice(from, 1);
  phrases.splice(to, 0, phrase);
  syncValuePhrase();
  bankDirty = true;
  renderBank();
  $('phraseEditor').querySelector(`[data-phrase-handle="${to}"]`).focus({preventScroll:true});
  $('phraseOrderAnnouncement').textContent = `Phrase moved to ${to + 1} of ${phrases.length}.`;
}
function bindBankHandles(container, rowSelector, handleSelector, move) {
  container.querySelectorAll(handleSelector).forEach(handle => {
    handle.onkeydown = event => {
      if (event.key === 'Escape') { clearBankDrag(); return; }
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      clearBankDrag();
      const from = Number(handle.dataset.reorderIndex);
      move(from, from + (event.key === 'ArrowUp' ? -1 : 1));
    };
    handle.onpointerdown = event => {
      if (event.button !== 0 || !event.isPrimary) return;
      event.preventDefault();
      clearBankDrag();
      handle.focus({preventScroll:true});
      const from = Number(handle.dataset.reorderIndex);
      bankDrag = {from, to:from, pointerId:event.pointerId, handle};
      handle.setPointerCapture?.(event.pointerId);
      handle.closest(rowSelector).classList.add('dragging');
    };
    handle.onpointermove = event => {
      if (!bankDrag || event.pointerId !== bankDrag.pointerId) return;
      const rows = [...container.querySelectorAll(rowSelector)];
      rows.forEach(row => row.classList.remove('drop-before', 'drop-after'));
      let target = rows.findIndex(row => event.clientY < row.getBoundingClientRect().bottom);
      if (target < 0) target = rows.length - 1;
      const rect = rows[target].getBoundingClientRect();
      const after = event.clientY >= rect.top + rect.height / 2;
      let to = target + (after ? 1 : 0);
      if (bankDrag.from < to) to--;
      bankDrag.to = to;
      if (to !== bankDrag.from) rows[target].classList.add(after ? 'drop-after' : 'drop-before');
      if (event.clientY < 60) window.scrollBy(0, -12);
      else if (event.clientY > window.innerHeight - 60) window.scrollBy(0, 12);
    };
    handle.onpointerup = event => {
      if (!bankDrag || event.pointerId !== bankDrag.pointerId) return;
      const {from, to} = bankDrag;
      clearBankDrag();
      move(from, to);
    };
    handle.onpointercancel = handle.onlostpointercapture = clearBankDrag;
  });
}
function topicDetails(cat) {
  const config = bankDraft.topicSettings[cat];
  if (config.type !== 'value') {
    const count = bankDraft.categories[cat].length;
    return `${count} ${count === 1 ? 'option' : 'options'}`;
  }
  const parts = [config.valueType === 'text' ? 'Text' : 'Number', config.unit, `${config.phrases.length} ${config.phrases.length === 1 ? 'phrase' : 'phrases'}`];
  if (config.valueType === 'number') {
    if (config.min !== '' && config.max !== '') parts.push(`${config.min}–${config.max}`);
    else if (config.min !== '') parts.push(`Min ${config.min}`);
    else if (config.max !== '') parts.push(`Max ${config.max}`);
  }
  return parts.filter(Boolean).join(' · ');
}
function renderBankList() {
  $('bankTopicCount').textContent = bankDraft.categoryOrder.length;
  $('bankTopicList').innerHTML = bankDraft.categoryOrder.map((cat, i) => `<li class="bank-topic-row"><button class="phrase-grip" data-topic-handle="${i}" data-reorder-index="${i}" aria-label="Reorder topic ${escapeHTML(cat)}" aria-describedby="topicOrderHelp" aria-keyshortcuts="ArrowUp ArrowDown" title="Drag to reorder; use Up/Down arrow keys" ${bankDraft.categoryOrder.length < 2 ? 'disabled' : ''}>${reorderGrip}</button><span class="bank-topic-name">${escapeHTML(cat)}</span><div class="bank-topic-meta"><span>${bankDraft.topicSettings[cat].type === 'value' ? 'Value Entry' : 'Selection'}</span><span>${escapeHTML(topicDetails(cat))}</span></div><button class="button" data-edit-topic="${i}" aria-label="Edit ${escapeHTML(cat)}">Edit</button></li>`).join('') || '<li class="empty-state">Add a topic to build your phrase bank.</li>';
  $('bankTopicList').querySelectorAll('[data-edit-topic]').forEach(button => { button.onclick = () => {
    bankCategory = bankDraft.categoryOrder[Number(button.dataset.editTopic)];
    bankEditing = true;
    renderBank();
    $('bankView').scrollIntoView({block:'start'});
    $('bankTopicName').focus({preventScroll:true});
  }; });
  bindBankHandles($('bankTopicList'), '.bank-topic-row', '[data-topic-handle]', moveBankTopic);
}
function moveBankTopic(from, to) {
  const topics = bankDraft.categoryOrder;
  if (from === to || from < 0 || to < 0 || from >= topics.length || to >= topics.length) return;
  const [topic] = topics.splice(from, 1);
  topics.splice(to, 0, topic);
  bankDirty = true;
  renderBank();
  $('bankTopicList').querySelector(`[data-topic-handle="${to}"]`).focus({preventScroll:true});
  $('topicOrderAnnouncement').textContent = `${topic} moved to ${to + 1} of ${topics.length}.`;
}
function renderBank() {
  clearBankDrag();
  if (!bankDraft.categoryOrder.includes(bankCategory)) bankCategory = bankDraft.categoryOrder[0];
  if (!bankCategory) bankEditing = false;
  $('bankIndex').hidden = bankEditing;
  $('bankTopicEditor').hidden = !bankEditing;
  renderBankList();
  $('bankTopic').innerHTML = bankDraft.categoryOrder.map(cat => `<option ${cat === bankCategory ? 'selected' : ''}>${escapeHTML(cat)}</option>`).join('');
  $('bankTopic').disabled = !bankCategory;
  $('bankCategoryName').textContent = bankCategory || 'No categories yet';
  $('removeCategory').disabled = !bankCategory;
  $('addPhrase').disabled = !bankCategory;
  $('bankPanel').hidden = !bankCategory;
  $('bankTopicName').value = bankCategory || '';
  $('bankTopicName').setCustomValidity('');
  $('bankTopicName').removeAttribute('aria-invalid');
  $('topicNameError').hidden = true;
  const index = bankDraft.categoryOrder.indexOf(bankCategory);
  $('previousBankTopic').disabled = index <= 0;
  $('nextBankTopic').disabled = index < 0 || index === bankDraft.categoryOrder.length - 1;
  $('bankPosition').textContent = index < 0 ? '0 / 0' : `${index + 1} / ${bankDraft.categoryOrder.length}`;
  if (!bankCategory) { updateBankStatus(); return; }
  const config = bankDraft.topicSettings[bankCategory];
  $('topicType').value = config.type;
  const isValue = config.type === 'value';
  $('bankDefinitionHeading').textContent = isValue ? 'Matching phrases' : 'Phrases';
  const phrases = activeBankPhrases();
  const usesValue = isValue || phrases.some(opt => /\[Value\]/.test(opt.phrase));
  $('valueSettings').hidden = !usesValue;
  $('valuePhraseHelp').hidden = !isValue;
  for (const [id, key] of Object.entries({valueType:'valueType',valueUnit:'unit',valueMin:'min',valueMax:'max'})) $(id).value = config[key];
  document.querySelectorAll('.number-setting').forEach(field => { field.hidden = config.valueType !== 'number'; });
  $('addPhrase').hidden = false;
  $('addPhrase').textContent = isValue ? 'Add matching phrase' : 'Add phrase';
  $('phraseEditor').innerHTML = phrases.length ? phrases.map((opt, i) => {
    const id = isValue ? (i ? `valuePhrase-${i}` : 'valuePhrase') : `phrase-${i}`;
    return `<div class="field phrase-edit-row"><button class="phrase-grip" data-phrase-handle="${i}" data-reorder-index="${i}" aria-label="Reorder phrase ${i + 1}" aria-describedby="phraseOrderHelp" aria-keyshortcuts="ArrowUp ArrowDown" title="Drag to reorder; use Up/Down arrow keys" ${phrases.length < 2 ? 'disabled' : ''}>${reorderGrip}</button><label class="visually-hidden" for="${id}">${isValue ? `Matching phrase${i ? ' ' + (i + 1) : ''}` : `Option ${i + 1} phrase`}</label><textarea id="${id}" data-index="${i}" rows="1" maxlength="10000">${escapeHTML(opt.phrase)}</textarea><div class="option-actions"><button class="text-button danger" data-remove="${i}" aria-label="Remove option ${i + 1}">Remove</button></div></div>`;
  }).join('') : '<p class="empty-state">Add a phrase to this topic.</p>';
  bindBankHandles($('phraseEditor'), '.phrase-edit-row', '[data-phrase-handle]', movePhrase);
  $('phraseEditor').querySelectorAll('textarea').forEach(ta => {
    fitPhraseBox(ta);
    ta.oninput = () => {
      activeBankPhrases()[Number(ta.dataset.index)].phrase = ta.value;
      syncValuePhrase();
      fitPhraseBox(ta);
      bankDirty = true;
      updateBankStatus();
    };
  });
  $('phraseEditor').querySelectorAll('[data-remove]').forEach(button => { button.onclick = () => {
    activeBankPhrases().splice(Number(button.dataset.remove), 1);
    syncValuePhrase();
    bankDirty = true;
    renderBank();
  }; });
  updateBankStatus();
  if (pendingBankImport) showBankImport(pendingBankImport, bankImportFilename);
}
function resetBankDraft() {
  bankDraft = clone({ categories: state.categories, categoryOrder: state.categoryOrder, topicSettings: state.topicSettings });
  bankDraft.topicOrigins = Object.fromEntries(state.categoryOrder.map(cat => [cat, cat]));
  for (const cat of bankDraft.categoryOrder) {
    bankDraft.categories[cat].forEach(opt => { opt.original = opt.phrase; });
    bankDraft.topicSettings[cat].phrases.forEach(opt => { opt.original = opt.phrase; });
  }
  bankDirty = false;
  pendingBankImport = null;
  $('bankImportPreview').hidden = true;
  $('bankFileError').hidden = true;
}
function checkedBankDraft() {
  const categories = Object.fromEntries(bankDraft.categoryOrder.map(cat => [cat, bankDraft.categories[cat].filter(opt => opt.phrase.trim()).map(opt => ({phrase:opt.phrase.trim(), label:opt.label.trim()}))]));
  const topicSettings = Object.fromEntries(bankDraft.categoryOrder.map(cat => [cat, {...bankDraft.topicSettings[cat], phrases:bankDraft.topicSettings[cat].phrases.filter(opt => opt.phrase.trim()).map(opt => ({phrase:opt.phrase.trim(), label:opt.label.trim()}))}]));
  return Core.bankFile({categories, categoryOrder:bankDraft.categoryOrder, topicSettings});
}
function showBankImport(payload, filename) {
  pendingBankImport = payload;
  bankImportFilename = filename;
  const existing = new Set(bankDraft.categoryOrder.map(cat => cat.toLowerCase()));
  const added = payload.categoryOrder.filter(cat => !existing.has(cat.toLowerCase())).length;
  const values = payload.categoryOrder.filter(cat => payload.topicSettings[cat].type === 'value').length;
  $('bankImportPreview').hidden = false;
  $('bankImportPreview').innerHTML = `<h3>${escapeHTML(filename)}</h3><p>${payload.categoryOrder.length} topics · ${values} value ${values === 1 ? 'entry' : 'entries'}. ${added} new topics; ${payload.categoryOrder.length - added} already in this bank.</p><p>Student details and final comments are kept. Save bank to apply; Discard changes cancels. Replacing clears draft selections that don't match the new bank.</p><div class="actions"><button id="addBankTopics" class="button" ${added ? '' : 'disabled'}>Add new topics</button><button id="replaceBank" class="button primary">Replace bank</button><button id="cancelBankImport" class="text-button">Cancel</button></div>`;
  $('addBankTopics').onclick = () => applyBankImport(false);
  $('replaceBank').onclick = () => applyBankImport(true);
  $('cancelBankImport').onclick = () => { pendingBankImport = null; $('bankImportPreview').hidden = true; };
}
async function applyBankImport(replace) {
  if (!pendingBankImport) return;
  if (replace && bankDirty && !await confirmAction('Replace unsaved bank edits?', 'The imported bank will replace your pending edits. Your saved bank stays intact until you choose Save bank.', 'Replace pending edits')) return;
  const previousDraft = bankDraft;
  const incoming = clone(pendingBankImport);
  if (replace) {
    bankDraft = incoming;
    bankDraft.topicOrigins = {};
    const used = new Set();
    for (const cat of incoming.categoryOrder) if (Object.hasOwn(state.categories, cat)) { bankDraft.topicOrigins[cat] = cat; used.add(cat); }
    for (const cat of incoming.categoryOrder) if (!Object.hasOwn(bankDraft.topicOrigins, cat)) {
      const source = previousDraft.topicOrigins[cat];
      bankDraft.topicOrigins[cat] = source && !used.has(source) ? source : null;
      if (source) used.add(source);
    }
  }
  else {
    const existing = new Set(bankDraft.categoryOrder.map(cat => cat.toLowerCase()));
    if (bankDraft.categoryOrder.length + incoming.categoryOrder.filter(cat => !existing.has(cat.toLowerCase())).length > 100) {
      $('bankFileError').textContent = 'A bank can contain up to 100 topics. Remove some topics or choose Replace bank.';
      $('bankFileError').hidden = false;
      return;
    }
    for (const cat of incoming.categoryOrder) {
      if (existing.has(cat.toLowerCase())) continue;
      bankDraft.categoryOrder.push(cat);
      bankDraft.categories[cat] = incoming.categories[cat];
      bankDraft.topicSettings[cat] = incoming.topicSettings[cat];
      bankDraft.topicOrigins[cat] = null;
      existing.add(cat.toLowerCase());
    }
  }
  for (const cat of bankDraft.categoryOrder) {
    const source = bankDraft.topicOrigins[cat];
    for (const [options, previousOptions, savedOptions] of [
      [bankDraft.categories[cat], previousDraft.categories[cat], state.categories[source]],
      [bankDraft.topicSettings[cat].phrases, previousDraft.topicSettings[cat]?.phrases, state.topicSettings[source]?.phrases]
    ]) for (const option of options) {
      const previous = previousOptions?.find(opt => opt.phrase === option.phrase);
      if (previous?.original != null) option.original = previous.original;
      else if (savedOptions?.some(opt => opt.phrase === option.phrase)) option.original = option.phrase;
    }
  }
  pendingBankImport = null;
  $('bankImportPreview').hidden = true;
  bankDirty = true;
  renderBank();
  $('saveBank').focus();
}
function download(payload, filename, type = 'application/json') {
  const blob = new Blob([typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const datedFilename = stem => {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `${stem}_${date}.json`;
};
function exportStudentRoster() {
  download(Core.roster(state), datedFilename('StudentRoster'));
  toast('Roster exported. Your co-teacher can import this file.');
}
function previewRosterImport(payload, filename) {
  pendingRosterImport = payload;
  const result = Core.mergeRoster(state.students, payload.students);
  $('rosterImportPreview').hidden = false;
  $('rosterImportPreview').innerHTML = `<h3>${escapeHTML(filename)}</h3><p>${payload.students.length} students · ${result.added} new · ${result.skipped} already in your class.</p><p>Names and pronouns only. Adding students keeps your existing comments and phrase bank.</p><div class="actions"><button id="addRosterStudents" class="button primary" ${result.added ? '' : 'disabled'}>Add students to class</button><button id="replaceRosterStudents" class="button">Start class from roster</button><button id="cancelRosterImport" class="text-button">Cancel</button></div>`;
  $('addRosterStudents').onclick = () => applyRosterImport(false);
  $('replaceRosterStudents').onclick = () => applyRosterImport(true);
  $('cancelRosterImport').onclick = () => { pendingRosterImport = null; $('rosterImportPreview').hidden = true; };
}
async function applyRosterImport(replace) {
  const payload = pendingRosterImport;
  if (!payload) return;
  if (replace && !await confirmAction('Start a class from this roster?', 'This replaces your students and their comments with the imported roster. Your phrase bank will be kept. You can undo this change.', 'Start from roster')) return;
  snapshot(replace ? 'Started a class from the shared roster.' : 'Student roster imported. Existing comments were kept.');
  const result = Core.mergeRoster(replace ? [] : state.students, payload.students);
  const wasEmpty = !state.students.length;
  state.students = result.students;
  if (replace || wasEmpty) state.className = payload.className;
  if (!current() || replace) currentId = state.students[0]?.id;
  pendingRosterImport = null;
  $('rosterImportPreview').hidden = true;
  save();
  setView('roster');
  $('rosterImport').focus();
  toast(`${result.added} students added · ${result.skipped} already in your class.`);
}
function previewImport(payload, filename) {
  pendingImport = payload;
  const comments = payload.students.filter(student => student.finalComment.trim()).length;
  const count = (amount, label) => `${amount} ${label}${amount === 1 ? '' : 's'}`;
  const summary = [count(payload.students.length, 'student'), count(comments, 'saved comment'), count(payload.categoryOrder.length, 'topic')].join(' · ');
  $('importPreview').hidden = false;
  $('importPreview').innerHTML = `<h3>${escapeHTML(payload.className)}</h3><p>${escapeHTML(filename)} · ${summary}</p><p>Includes student details, comments, values, selections, and the phrase bank. Restoring replaces the current class and supports Undo.</p><div class="actions"><button id="applyImport" class="button primary">Restore class backup</button><button id="cancelClassImport" class="text-button">Cancel</button></div>`;
  $('applyImport').onclick = applyImport;
  $('cancelClassImport').onclick = () => {
    pendingImport = null;
    $('importPreview').hidden = true;
    $('importClass').focus();
  };
}
async function applyImport() {
  const payload = pendingImport;
  if (!payload) return;
  const message = 'This replaces your current students, comments, values, and phrase bank.' + (bankDirty ? ' Unsaved phrase-bank edits will also be replaced.' : '') + ' Export a class backup first to keep a separate copy. You can undo this restore.';
  if (!await confirmAction('Restore this class backup?', message, 'Restore backup')) return;
  snapshot('Class backup restored.');
  state = {className:payload.className, students:payload.students, categories:payload.categories, categoryOrder:payload.categoryOrder, topicSettings:payload.topicSettings};
  currentId = state.students[0]?.id;
  resetBankDraft();
  pendingImport = null;
  $('importPreview').hidden = true;
  save();
  setView('overview');
  $('importClass').focus();
  toast('Class backup restored, including comments.');
}

$('openHelp').onclick = event => {
  event.preventDefault();
  if (view !== 'help') helpReturnView = view;
  setView('help');
  $('helpHeading').focus();
};
$('closeHelp').onclick = () => {
  setView(helpReturnView);
  $('openHelp').focus();
};
document.querySelectorAll('[data-view]').forEach(button => { button.onclick = () => {
  if (button.dataset.view === 'bank') bankEditing = false;
  setView(button.dataset.view);
}; });
$('backToBankList').onclick = () => {
  if (!$('bankTopicName').reportValidity()) { $('bankTopicName').focus(); return; }
  bankEditing = false;
  renderBank();
  $('bankTopicList').querySelector(`[data-edit-topic="${bankDraft.categoryOrder.indexOf(bankCategory)}"]`)?.focus();
};
$('studentSelect').onchange = event => { currentId = event.target.value; renderWrite(); };
$('prevStudent').onclick = () => moveStudent(-1);
$('nextStudent').onclick = () => moveStudent(1);
$('editStudentDetails').onclick = event => { event.preventDefault(); openStudentEditor(); };
function addStudentToClass() {
  const s = newStudent();
  state.students.push(s);
  currentId = s.id;
  save();
  openStudentEditor();
}
$('addStudent').onclick = addStudentToClass;
$('finalText').oninput = event => {
  if (!current()) return;
  current().finalComment = event.target.value;
  if (event.target.value.trim()) current().status = 'Draft';
  save();
  updatePreview();
};
$('useDraft').onclick = async () => {
  const s = current();
  if (!s || Core.needsValue(s, state)) return;
  const draft = Core.draft(s, state);
  if (!draft) return;
  if (s.finalComment.trim() && s.finalComment !== draft && !await confirmAction('Replace your final comment?', 'This replaces the final comment with the current generated draft. You can undo this change.', 'Replace with draft')) return;
  snapshot('Draft copied to final comment.');
  s.finalComment = draft;
  s.status = 'Draft';
  save();
  $('finalText').value = draft;
  updatePreview();
  $('finalText').focus();
};
$('clearFinal').onclick = async () => {
  if (!current()?.finalComment) return;
  if (!await confirmAction('Clear the final comment?', 'Your phrase selections will be kept. You can undo this change.', 'Clear comment')) return;
  snapshot('Final comment cleared.');
  current().finalComment = '';
  current().status = Object.keys(current().selections).length ? 'Draft' : 'Not started';
  save();
  $('finalText').value = '';
  updatePreview();
};
async function copyStudentComment(student) {
  const text = student?.finalComment;
  if (!text?.trim()) return;
  let copied = false;
  try { await navigator.clipboard.writeText(text); copied = true; } catch {}
  if (!copied) {
    const active = document.activeElement;
    const field = document.createElement('textarea');
    field.className = 'visually-hidden';
    field.readOnly = true;
    field.value = text;
    field.setAttribute('aria-label', 'Comment to copy');
    document.body.append(field);
    try {
      field.focus({preventScroll:true});
      field.select();
      copied = document.execCommand?.('copy') === true;
    } catch {} finally {
      field.remove();
      active?.focus({preventScroll:true});
    }
  }
  if (copied) { toast(`Comment copied for ${displayName(student)}.`); return; }
  currentId = student.id;
  setView('write');
  $('finalText').focus();
  $('finalText').select();
  toast('Comment selected. Press Ctrl+C or Command+C to copy.');
}
$('copyFinal').onclick = () => copyStudentComment(current());
$('markDone').onclick = () => {
  if (!current()?.finalComment.trim() || !current()?.fullName.trim()) return;
  current().status = 'Done';
  save();
  const index = state.students.findIndex(s => s.id === currentId);
  if (index < state.students.length - 1) moveStudent(1);
  else { updatePreview(); toast('Marked done. You’ve reached the last student.'); }
};
$('filterStatus').onchange = renderOverview;
$('overviewTopic').onchange = event => { overviewCategory = event.target.value; renderOverview(); };
$('bankTopic').onchange = event => { bankCategory = event.target.value; renderBank(); };
$('className').oninput = event => { state.className = event.target.value || 'My class'; save(); };
$('exportComments').onclick = () => {
  const csvCell = value => '"' + String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
  const rows = [['Full name', 'Preferred name', 'Progress', 'Final comment'], ...state.students.map(s => [s.fullName, s.prefName, s.status, s.finalComment])];
  download('\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'ReportCardComments.csv', 'text/csv;charset=utf-8');
  toast('Final comments exported.');
};
$('newClass').onclick = async () => {
  if (!await confirmAction('Start a new class?', 'Your current class will be replaced with one blank student. Your phrase bank will be kept. Export a backup first to keep a separate copy, or undo after starting over.', 'Start new class')) return;
  snapshot('Started a new class.');
  const s = newStudent();
  state.students = [s];
  state.className = 'My class';
  currentId = s.id;
  save();
  openStudentEditor();
};
$('undoBtn').onclick = () => {
  if (!undoState) return;
  state = undoState;
  undoState = null;
  clearTimeout(undoTimer);
  if (!current()) currentId = state.students[0]?.id;
  resetBankDraft();
  $('undoNotice').hidden = true;
  save();
  setView(view);
  toast('Previous class state restored.');
};
$('dismissUndo').onclick = () => { undoState = null; clearTimeout(undoTimer); $('undoNotice').hidden = true; };
$('undoNotice').addEventListener('focusin', () => clearTimeout(undoTimer));
$('undoNotice').addEventListener('focusout', event => {
  if (!$('undoNotice').contains(event.relatedTarget)) scheduleUndoNotice();
});
for (const [id, offset] of [['previousBankTopic', -1], ['nextBankTopic', 1]]) $(id).onclick = () => {
  const next = bankDraft.categoryOrder[bankDraft.categoryOrder.indexOf(bankCategory) + offset];
  if (!next) return;
  bankCategory = next;
  renderBank();
  ($(id).disabled ? $('bankTopic') : $(id)).focus({preventScroll:true});
};
$('topicType').onchange = event => {
  const config = bankDraft.topicSettings[bankCategory];
  config.type = event.target.value;
  if (config.type === 'value' && !config.phrases.length) config.phrases = bankDraft.categories[bankCategory].length ? clone(bankDraft.categories[bankCategory]) : [{label:'',phrase:config.phrase}];
  syncValuePhrase();
  bankDirty = true;
  renderBank();
};
$('bankTopicName').oninput = event => {
  const name = event.target.value.trim();
  const oldName = bankCategory;
  let error = '';
  if (!name || name.length > 100) error = 'Enter a topic name (up to 100 characters).';
  else if (['__proto__', 'constructor', 'prototype', 'final comments'].includes(name.toLowerCase())) error = 'Choose a different topic name.';
  else if (bankDraft.categoryOrder.some(cat => cat !== oldName && cat.toLowerCase() === name.toLowerCase())) error = 'A topic with that name already exists.';
  event.target.setCustomValidity(error);
  event.target.setAttribute('aria-invalid', String(!!error));
  $('topicNameError').textContent = error;
  $('topicNameError').hidden = !error;
  if (!error && name !== oldName) {
    bankDraft.categories[name] = bankDraft.categories[oldName];
    bankDraft.topicSettings[name] = bankDraft.topicSettings[oldName];
    bankDraft.topicOrigins[name] = bankDraft.topicOrigins[oldName];
    delete bankDraft.categories[oldName];
    delete bankDraft.topicSettings[oldName];
    delete bankDraft.topicOrigins[oldName];
    bankDraft.categoryOrder = bankDraft.categoryOrder.map(cat => cat === oldName ? name : cat);
    bankDraft.topicSettings[name].valueLabel = name;
    bankCategory = name;
    $('bankCategoryName').textContent = name;
    const option = $('bankTopic').selectedOptions[0];
    option.value = name;
    option.textContent = name;
    bankDirty = true;
    if (pendingBankImport) showBankImport(pendingBankImport, bankImportFilename);
  }
  updateBankStatus();
};
for (const [id, key] of Object.entries({valueType:'valueType', valueUnit:'unit', valueMin:'min', valueMax:'max'})) {
  const input = $(id);
  input.addEventListener(id === 'valueType' ? 'change' : 'input', () => {
    bankDraft.topicSettings[bankCategory][key] = input.value;
    bankDirty = true;
    updateBankStatus();
    if (id === 'valueType') renderBank();
  });
}
$('addCategory').onclick = () => {
  $('newCategoryName').value = '';
  $('categoryError').hidden = true;
  $('categoryDialog').showModal();
  $('newCategoryName').focus();
};
$('cancelCategory').onclick = () => $('categoryDialog').close();
$('categoryForm').onsubmit = event => {
  event.preventDefault();
  const name = $('newCategoryName').value.trim();
  if (!name || Object.keys(bankDraft.categories).some(c => c.toLowerCase() === name.toLowerCase()) || ['__proto__', 'constructor', 'prototype', 'Final comments'].includes(name) || bankDraft.categoryOrder.length >= 100) {
    $('categoryError').textContent = 'Choose a unique category name (up to 100 categories).';
    $('categoryError').hidden = false;
    return;
  }
  bankDraft.categories[name] = [{ phrase: '[PrefName] ', label: '' }];
  bankDraft.categoryOrder.push(name);
  bankDraft.topicSettings[name] = { ...Core.bank({ [name]: [] }, [name]).topicSettings[name], type: 'selection' };
  bankDraft.topicOrigins[name] = null;
  bankCategory = name;
  bankEditing = true;
  bankDirty = true;
  $('categoryDialog').close();
  renderBank();
  $('phrase-0')?.focus();
};
$('addPhrase').onclick = () => {
  if (!bankCategory) return;
  if (activeBankPhrases().length >= 100) { toast('Each topic can have up to 100 phrases.'); return; }
  activeBankPhrases().push({ phrase: '[PrefName] ', label: '' });
  syncValuePhrase();
  bankDirty = true;
  renderBank();
  const areas = $('phraseEditor').querySelectorAll('textarea');
  areas[areas.length - 1]?.focus();
};
$('removeCategory').onclick = async () => {
  if (!bankCategory || !await confirmAction('Remove this topic?', `Remove “${bankCategory}” and its phrases or value entry? This takes effect when you save the bank. Final comments will be kept.`, 'Remove topic')) return;
  delete bankDraft.categories[bankCategory];
  delete bankDraft.topicSettings[bankCategory];
  delete bankDraft.topicOrigins[bankCategory];
  bankDraft.categoryOrder = bankDraft.categoryOrder.filter(c => c !== bankCategory);
  bankEditing = false;
  bankDirty = true;
  renderBank();
};
$('discardBank').onclick = async () => {
  if (!await confirmAction('Discard phrase changes?', 'The phrase bank will return to its last saved version.', 'Discard changes')) return;
  resetBankDraft();
  renderBank();
};
$('saveBank').onclick = () => {
  let validated;
  try { validated = checkedBankDraft(); }
  catch (error) { toast(error.message); return; }
  snapshot('Phrase bank saved. Final comments were kept.');
  for (const s of state.students) {
    s.values = Object.fromEntries(validated.categoryOrder.flatMap(cat => {
      const source = bankDraft.topicOrigins[cat];
      if (!source) return [];
      if (Object.hasOwn(s.values || {}, source)) return [[cat, s.values[source]]];
      if (source !== cat && source === 'Fluency' && s.fluencyScore !== '') return [[cat, s.fluencyScore]];
      return [];
    }));
    s.selections = Object.fromEntries(validated.categoryOrder.flatMap(cat => {
      const source = bankDraft.topicOrigins[cat];
      if (!source || !Object.hasOwn(s.selections, source)) return [];
      const phrase = s.selections[source];
      const next = validated.topicSettings[cat];
      const previous = state.topicSettings[source];
      const options = next.type === 'value' ? bankDraft.topicSettings[cat].phrases : bankDraft.categories[cat];
      const replacement = options.find(opt => opt.original === phrase || opt.phrase === phrase);
      if (replacement?.phrase.trim()) return [[cat, Core.normalizePhrase(replacement.phrase.trim())]];
      if (next.type === 'value' && previous.type !== 'value') return [[cat, next.phrase]];
      return [];
    }));
  }
  activeCategory = validated.categoryOrder.find(cat => bankDraft.topicOrigins[cat] === activeCategory) || activeCategory;
  overviewCategory = validated.categoryOrder.find(cat => bankDraft.topicOrigins[cat] === overviewCategory) || overviewCategory;
  state.categories = validated.categories;
  state.categoryOrder = validated.categoryOrder;
  state.topicSettings = validated.topicSettings;
  resetBankDraft();
  const retained = save();
  renderBank();
  toast(retained ? 'Phrase bank saved. Final comments were kept.' : 'Bank updated for this visit. Export a bank or class backup before leaving.');
};
$('exportBank').onclick = () => {
  $('bankFileError').hidden = true;
  try {
    download(Core.exportBank(checkedBankDraft()), datedFilename('PhraseBank'));
    toast(bankDirty ? 'Bank exported, including unsaved edits.' : 'Bank exported.');
  } catch (error) { $('bankFileError').textContent = error.message; $('bankFileError').hidden = false; }
};
$('loadDefaultBank').onclick = () => showBankImport(Core.bankFile(INITIAL_DATA), 'Default phrase bank');
$('importBank').onclick = () => {
  $('bankFile').value = '';
  $('bankFileError').hidden = true;
  $('bankFile').click();
};
$('bankFile').onchange = async event => {
  const file = event.target.files[0];
  pendingBankImport = null;
  $('bankImportPreview').hidden = true;
  $('bankFileError').hidden = true;
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('Choose a JSON file smaller than 10 MB.');
    const payload = Core.bankFile(JSON.parse(await file.text()));
    if (file !== $('bankFile').files[0]) return;
    showBankImport(payload, file.name || 'Imported bank');
  } catch (error) {
    if (file !== $('bankFile').files[0]) return;
    $('bankFileError').textContent = error instanceof SyntaxError ? 'This is not valid JSON. Choose a phrase bank file.' : error.message;
    $('bankFileError').hidden = false;
  }
};
$('rosterExport').onclick = exportStudentRoster;
$('rosterImport').onclick = () => {
  $('rosterFile').value = '';
  $('rosterImportError').hidden = true;
  $('rosterFile').click();
};
$('rosterFile').onchange = async event => {
  const file = event.target.files[0];
  pendingRosterImport = null;
  $('rosterImportError').hidden = true;
  $('rosterImportPreview').hidden = true;
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('Choose a JSON file smaller than 10 MB.');
    const imported = Core.validate(JSON.parse(await file.text()), state);
    if (file !== $('rosterFile').files[0]) return;
    const roster = Core.validate(Core.roster(imported), state);
    if (!roster.students.length) throw new Error('This file has no named students to import.');
    previewRosterImport(roster, file.name || 'Imported roster');
  } catch (error) {
    if (file !== $('rosterFile').files[0]) return;
    $('rosterImportError').textContent = error instanceof SyntaxError ? 'This is not valid JSON. Choose a student roster or class backup.' : error.message;
    $('rosterImportError').hidden = false;
  }
};
$('exportBackup').onclick = () => { download(Core.backup(state), datedFilename('ReportCardClass')); toast('Class backup exported.'); };
$('importClass').onclick = () => {
  pendingImport = null;
  $('importFile').value = '';
  $('importPreview').hidden = true;
  $('importError').hidden = true;
  $('importFile').click();
};
$('importFile').onchange = async event => {
  const file = event.target.files[0];
  pendingImport = null;
  $('importError').hidden = true;
  $('importPreview').hidden = true;
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('Choose a JSON file smaller than 10 MB.');
    const raw = JSON.parse(await file.text());
    if (file !== $('importFile').files[0]) return;
    if (raw?.kind === 'roster') throw new Error('This file contains student details only. Import it from Student roster.');
    const payload = Core.validate(raw);
    previewImport(payload, file.name || 'Class backup');
  } catch (error) {
    if (file !== $('importFile').files[0]) return;
    $('importError').textContent = error instanceof SyntaxError ? 'This is not valid JSON. Choose a class backup exported from this app.' : error.message;
    $('importError').hidden = false;
  }
};
window.addEventListener('beforeunload', event => {
  if (bankDirty || !storageAvailable) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('resize', () => {
  if (!$('bankView').hidden) $('bankView').querySelectorAll('textarea').forEach(fitPhraseBox);
});
resetBankDraft();
save();
renderWrite();
if (!state.students.length) setView('roster');
if (startupMessage) toast(startupMessage);
