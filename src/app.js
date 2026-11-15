const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const STORAGE_KEY = 'report-card-comment-builder-v2';
const clone = value => JSON.parse(JSON.stringify(value));
let startupMessage = '';
let state = Core.validate({ ...INITIAL_DATA, className: 'My class' });
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) state = Core.validate(JSON.parse(saved), state);
} catch {
  startupMessage = 'Saved work could not be loaded. You can import a class backup from Share & back up.';
}
let currentId = state.students[0]?.id;
let view = 'write';
let activeCategory = state.categoryOrder[0];
let overviewCategory = 'Final comments';
let bankCategory = state.categoryOrder[0];
let bankDraft = clone({ categories: state.categories, categoryOrder: state.categoryOrder, topicSettings: state.topicSettings });
let bankDirty = false;
let undoState = null;
let undoTimer;
let toastTimer;
let pendingImport = null;
let pendingBankImport = null;
let bankImportFilename = '';
let orderDraft = null;
let draggedOrderIndex = null;
const current = () => state.students.find(s => s.id === currentId);
const displayName = s => s.fullName || 'New student';

function newStudent() {
  return { id: crypto.randomUUID(), fullName: '', prefName: '', pronoun: 'She/Her', fluencyScore: '', values: {}, status: 'Not started', finalComment: '', selections: {} };
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $('saveStatus').hidden = true;
    $('saveStatus').textContent = '';
  } catch {
    $('saveStatus').textContent = 'Device storage is unavailable. Export a backup to keep your work.';
    $('saveStatus').hidden = false;
  }
  $('classCount').textContent = state.students.length;
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
  undoTimer = setTimeout(() => { $('undoNotice').hidden = true; }, 10000);
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
  for (const name of ['write', 'overview', 'roster', 'bank']) $(name + 'View').hidden = name !== view;
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
  return `<option value="">Skip this category</option>` + (state.categories[category] || []).map((opt, i) =>
    `<option value="${i}" ${opt.phrase === selected ? 'selected' : ''}>${escapeHTML(`Option ${i + 1}: ${opt.phrase.replace(/\[[^\]]+\]/g, '…')}`)}</option>`).join('');
}
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
    else s.selections[cat] = config.phrase;
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
  const options = state.categories[activeCategory] || [];
  const config = state.topicSettings[activeCategory];
  const topics = state.categoryOrder;
  const categoryIndex = state.categoryOrder.indexOf(activeCategory);
  panel.innerHTML = `<div class="topic-picker"><div class="field"><div class="topic-label"><label for="topicSelect">Topic</label><span id="topicPosition" class="muted">${categoryIndex + 1} / ${topics.length}</span></div><select id="topicSelect" title="${escapeHTML(activeCategory)}">${topics.map(cat => `<option ${cat === activeCategory ? 'selected' : ''}>${escapeHTML(cat)}</option>`).join('')}</select></div><button id="previousTopic" class="button" aria-label="Previous topic" ${categoryIndex <= 0 ? 'disabled' : ''}>Previous</button><button id="nextTopic" class="button" aria-label="Next topic" ${categoryIndex >= state.categoryOrder.length - 1 ? 'disabled' : ''}>Next</button></div>
    ${config.type === 'value' ? `<div class="topic-value-entry"><div class="field"><label for="topicValue">${escapeHTML(valueLabel(activeCategory, config))}</label>${valueInput(s, activeCategory, 'topicValue')}</div><button id="skipValue" class="text-button">Skip this topic</button><p id="valuePreview" class="value-preview">${escapeHTML(Core.personalize(s.selections[activeCategory] || config.phrase, s, Core.topicValue(s, activeCategory)))}</p></div>` : `<div class="phrase-options" role="radiogroup" aria-label="${escapeHTML(activeCategory)} phrases">
    ${options.map((opt, i) => `<label class="phrase-option ${s.selections[activeCategory] === opt.phrase ? 'chosen' : ''}"><input type="radio" name="phraseChoice" value="${i}" ${s.selections[activeCategory] === opt.phrase ? 'checked' : ''}><span class="phrase-text">${escapeHTML(Core.personalize(opt.phrase, s, Core.topicValue(s, activeCategory), config.unit))}</span></label>`).join('')}
    <label class="phrase-option ${!s.selections[activeCategory] ? 'chosen' : ''}"><input type="radio" name="phraseChoice" value="" ${!s.selections[activeCategory] ? 'checked' : ''}><span>Skip this topic</span></label></div>`}
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
  if ($('skipValue')) $('skipValue').onclick = () => { $('topicValue').value = ''; $('topicValue').dispatchEvent(new Event('input')); };
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
  if (value === '') delete s.selections[activeCategory];
  else s.selections[activeCategory] = state.categories[activeCategory][Number(value)].phrase;
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
  const options = state.categories[activeCategory] || [];
  $('categoryPanel').querySelectorAll('.phrase-text').forEach((el, i) => { if (options[i]) el.textContent = Core.personalize(options[i].phrase, current(), Core.topicValue(current(), activeCategory), state.topicSettings[activeCategory].unit); });
  if ($('valuePreview')) $('valuePreview').textContent = Core.personalize(current().selections[activeCategory] || state.topicSettings[activeCategory].phrase, current(), current().selections[activeCategory] ? Core.topicValue(current(), activeCategory) : '', state.topicSettings[activeCategory].unit);
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
  $('draftCount').textContent = draft ? `${draft.length} characters` : '';
  const selectedCount = Object.keys(s?.selections || {}).length;
  $('selectionCount').textContent = `${selectedCount} ${selectedCount === 1 ? 'topic' : 'topics'} selected`;
  $('scoreWarning').hidden = !s || !Core.needsScore(s, state);
  $('useDraft').disabled = !draft || Core.needsScore(s, state);
  $('copyFinal').disabled = !s?.finalComment.trim();
  $('clearFinal').disabled = !s?.finalComment;
  $('markDone').disabled = !s?.finalComment.trim() || !s?.fullName.trim();
  const length = s?.finalComment.length || 0;
  $('charCount').textContent = `${length.toLocaleString()} / 1,000 characters${length > 1000 ? ' · Over limit' : ''}`;
  $('charCount').classList.toggle('over-limit', length > 1000);
  $('studentStatus').textContent = s?.status || 'Not started';
  $('studentStatus').className = 'visually-hidden';
  $('writeHeading').textContent = s?.fullName ? `${s.prefName || s.fullName.split(' ')[0]}’s comment` : 'Comment';
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
  const search = $('searchStudents').value.toLowerCase().trim();
  const status = $('filterStatus').value;
  const students = state.students.filter(s => `${s.fullName} ${s.prefName}`.toLowerCase().includes(search) && (!status || s.status === status));
  $('overviewList').innerHTML = students.length ? students.map(s => {
    const category = overviewCategory === 'Final comments' ? null : overviewCategory;
    const selection = category ? s.selections[category] : '';
    const comment = category ? Core.topicSentence(s, state, category) : s.finalComment;
    const config = state.topicSettings[category];
    return `<article class="student-row ${category ? 'topic-row' : ''}" data-student="${escapeHTML(s.id)}"><h3><button class="student-name" data-open="${escapeHTML(s.id)}" title="${escapeHTML(displayName(s))}" aria-label="Open comment for ${escapeHTML(displayName(s))}">${escapeHTML(displayName(s))}</button></h3><span class="status ${s.status === 'Done' ? 'done' : s.status === 'Draft' ? 'draft' : ''}">${s.status}</span>
      <div class="row-comment">${category ? config.type === 'value' ? `<label class="visually-hidden" for="overview-value-${escapeHTML(s.id)}">${escapeHTML(valueLabel(category, config))} for ${escapeHTML(displayName(s))}</label>${valueInput(s, category, 'overview-value-' + s.id, `data-overview-value="${escapeHTML(s.id)}"`)}` : `<label class="visually-hidden" for="overview-choice-${escapeHTML(s.id)}">${escapeHTML(category)} phrase for ${escapeHTML(displayName(s))}</label><select id="overview-choice-${escapeHTML(s.id)}" data-choice="${escapeHTML(s.id)}">${phraseOptions(category, selection)}</select>` : `<p class="${comment ? '' : 'muted'}" title="${escapeHTML(comment || 'No final comment yet.')}">${escapeHTML(comment || 'No final comment yet.')}</p>`}</div>
      </article>`;
  }).join('') : '<p class="empty-state">No students match. Try another name or progress filter.</p>';
  $('overviewList').querySelectorAll('[data-open]').forEach(button => { button.onclick = () => {
    currentId = button.dataset.open;
    if (overviewCategory !== 'Final comments') activeCategory = overviewCategory;
    setView('write');
    $('finalText').focus();
  }; });
  $('overviewList').querySelectorAll('[data-choice]').forEach(select => { select.onchange = () => {
    const s = state.students.find(item => item.id === select.dataset.choice);
    if (select.value === '') delete s.selections[overviewCategory];
    else s.selections[overviewCategory] = state.categories[overviewCategory][Number(select.value)].phrase;
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
  }).join('')}<td>${removeStudentButton(s)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty-state">No students match. Add a student or change your filters.</p>';
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
  const search = $('searchRoster').value.toLowerCase().trim();
  const students = state.students.filter(s => `${s.fullName} ${s.prefName}`.toLowerCase().includes(search));
  renderStudentEditor(students);
}
function openStudentEditor() {
  $('searchRoster').value = '';
  setView('roster');
  const input = [...$('rosterList').querySelectorAll('[data-field="fullName"]')].find(field => field.dataset.student === currentId);
  (input || $('searchRoster')).focus();
}
function updateBankStatus() {
  $('bankEditStatus').textContent = bankDirty ? 'Unsaved phrase changes' : 'No unsaved changes';
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
function renderBank() {
  if (!bankDraft.categoryOrder.includes(bankCategory)) bankCategory = bankDraft.categoryOrder[0];
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
  $('changeBankOrder').disabled = !bankDraft.categoryOrder.length;
  $('previousBankTopic').disabled = index <= 0;
  $('nextBankTopic').disabled = index < 0 || index === bankDraft.categoryOrder.length - 1;
  $('bankPosition').textContent = index < 0 ? '0 / 0' : `${index + 1} / ${bankDraft.categoryOrder.length}`;
  if (!bankCategory) { updateBankStatus(); return; }
  const config = bankDraft.topicSettings[bankCategory];
  $('topicType').value = config.type;
  const phrases = bankDraft.categories[bankCategory] || [];
  const usesValue = config.type === 'value' || phrases.some(opt => /\[(Score|Value|value)\]/.test(opt.phrase));
  $('valueSettings').hidden = !usesValue;
  $('valuePhrase').closest('.field').hidden = config.type !== 'value';
  for (const [id, key] of Object.entries({valueType:'valueType',valueUnit:'unit',valueMin:'min',valueMax:'max',valuePhrase:'phrase'})) $(id).value = config[key];
  document.querySelectorAll('.number-setting').forEach(field => { field.hidden = config.valueType !== 'number'; });
  fitPhraseBox($('valuePhrase'));
  $('phraseEditor').hidden = config.type === 'value';
  $('addPhrase').hidden = config.type === 'value';
  $('phraseEditor').innerHTML = phrases.length ? phrases.map((opt, i) => `<div class="phrase-edit-row"><label class="visually-hidden" for="phrase-${i}">Option ${i + 1} phrase</label><textarea id="phrase-${i}" data-index="${i}" rows="1" maxlength="10000">${escapeHTML(opt.phrase)}</textarea><div class="option-actions"><button class="text-button" data-option-up="${i}" aria-label="Move option ${i + 1} up" ${i === 0 ? 'disabled' : ''}>Up</button><button class="text-button" data-option-down="${i}" aria-label="Move option ${i + 1} down" ${i === phrases.length - 1 ? 'disabled' : ''}>Down</button><button class="text-button danger" data-remove="${i}" aria-label="Remove option ${i + 1}">Remove</button></div></div>`).join('') : '<p class="empty-state">Add a phrase to this topic.</p>';
  $('phraseEditor').querySelectorAll('textarea').forEach(ta => {
    fitPhraseBox(ta);
    ta.oninput = () => {
      bankDraft.categories[bankCategory][Number(ta.dataset.index)].phrase = ta.value;
      fitPhraseBox(ta);
      bankDirty = true;
      updateBankStatus();
    };
  });
  for (const [selector, key, offset] of [['[data-option-up]', 'optionUp', -1], ['[data-option-down]', 'optionDown', 1]]) {
    $('phraseEditor').querySelectorAll(selector).forEach(button => { button.onclick = () => {
      const i = Number(button.dataset[key]);
      [phrases[i], phrases[i + offset]] = [phrases[i + offset], phrases[i]];
      bankDirty = true;
      renderBank();
      $('phrase-' + (i + offset)).focus();
    }; });
  }
  $('phraseEditor').querySelectorAll('[data-remove]').forEach(button => { button.onclick = () => {
    bankDraft.categories[bankCategory].splice(Number(button.dataset.remove), 1);
    bankDirty = true;
    renderBank();
  }; });
  updateBankStatus();
  if (pendingBankImport) showBankImport(pendingBankImport, bankImportFilename);
}
function resetBankDraft() {
  bankDraft = clone({ categories: state.categories, categoryOrder: state.categoryOrder, topicSettings: state.topicSettings });
  bankDraft.topicOrigins = Object.fromEntries(state.categoryOrder.map(cat => [cat, cat]));
  for (const cat of bankDraft.categoryOrder) bankDraft.categories[cat].forEach(opt => { opt.original = opt.phrase; });
  bankDirty = false;
  pendingBankImport = null;
  $('bankImportPreview').hidden = true;
  $('bankFileError').hidden = true;
}
function checkedBankDraft() {
  const categories = Object.fromEntries(bankDraft.categoryOrder.map(cat => [cat, bankDraft.categories[cat].filter(opt => opt.phrase.trim()).map(opt => ({phrase:opt.phrase.trim(), label:opt.label.trim()}))]));
  return Core.bankFile({categories, categoryOrder:bankDraft.categoryOrder, topicSettings:bankDraft.topicSettings});
}
function orderItems() {
  return $('orderScope').value === 'topics' ? orderDraft.categoryOrder : orderDraft.categories[bankCategory];
}
function orderName(item) { return typeof item === 'string' ? item : item.phrase || 'Empty phrase'; }
function moveOrderItem(from, to) {
  const items = orderItems();
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
  $('applyOrder').disabled = JSON.stringify(orderDraft) === JSON.stringify(bankDraft);
  $('orderAnnouncement').textContent = `${orderName(item)} moved to ${to + 1} of ${items.length}.`;
  renderOrderList();
}
function clearOrderDrag() {
  draggedOrderIndex = null;
  $('orderList').querySelectorAll('.order-row').forEach(row => row.classList.remove('dragging', 'drop-before', 'drop-after'));
}
function renderOrderList() {
  const items = orderItems();
  $('orderList').innerHTML = items.map((item, i) => `<li class="order-row" draggable="true" data-order-index="${i}"><span class="order-grip" aria-hidden="true"><svg width="20" height="24" viewBox="0 0 20 24" fill="currentColor"><circle cx="6" cy="6" r="1.5"/><circle cx="14" cy="6" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="14" cy="12" r="1.5"/><circle cx="6" cy="18" r="1.5"/><circle cx="14" cy="18" r="1.5"/></svg></span><span class="order-name">${escapeHTML(orderName(item))}</span><div class="actions"><button class="text-button" data-order-up="${i}" aria-label="Move item ${i + 1} up" ${i === 0 ? 'disabled' : ''}>Up</button><button class="text-button" data-order-down="${i}" aria-label="Move item ${i + 1} down" ${i === items.length - 1 ? 'disabled' : ''}>Down</button></div></li>`).join('') || '<li class="empty-state">No options to reorder.</li>';
  for (const [selector, key, offset] of [['[data-order-up]', 'orderUp', -1], ['[data-order-down]', 'orderDown', 1]]) {
    $('orderList').querySelectorAll(selector).forEach(button => { button.onclick = () => {
      const from = Number(button.dataset[key]);
      moveOrderItem(from, from + offset);
      const next = $('orderList').querySelector(`[${offset < 0 ? 'data-order-up' : 'data-order-down'}="${from + offset}"]`);
      (next.disabled ? next.parentElement.querySelector('button:not(:disabled)') : next)?.focus({preventScroll:true});
    }; });
  }
  $('orderList').querySelectorAll('.order-row').forEach(row => {
    row.ondragstart = event => {
      draggedOrderIndex = Number(row.dataset.orderIndex);
      if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(draggedOrderIndex)); }
      row.classList.add('dragging');
    };
    row.ondragover = event => {
      if (draggedOrderIndex == null) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      $('orderList').querySelectorAll('.order-row').forEach(item => item.classList.remove('drop-before', 'drop-after'));
      const rect = row.getBoundingClientRect();
      row.classList.add(event.clientY >= rect.top + rect.height / 2 ? 'drop-after' : 'drop-before');
    };
    row.ondrop = event => {
      if (draggedOrderIndex == null) return;
      event.preventDefault();
      const from = draggedOrderIndex;
      const target = Number(row.dataset.orderIndex);
      const rect = row.getBoundingClientRect();
      const after = event.clientY >= rect.top + rect.height / 2;
      let to = target + (after ? 1 : 0);
      if (from < to) to--;
      clearOrderDrag();
      moveOrderItem(from, to);
    };
    row.ondragend = clearOrderDrag;
  });
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
  for (const cat of bankDraft.categoryOrder) for (const option of bankDraft.categories[cat]) {
    const previous = previousDraft.categories[cat]?.find(opt => opt.phrase === option.phrase);
    if (previous?.original != null) option.original = previous.original;
    else if (state.categories[bankDraft.topicOrigins[cat]]?.some(opt => opt.phrase === option.phrase)) option.original = option.phrase;
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
function previewImport(payload) {
  pendingImport = payload;
  const roster = payload.kind === 'roster';
  const result = Core.mergeRoster(state.students, payload.students);
  const names = payload.students.slice(0, 5).map(s => displayName(s)).join(', ');
  $('importPreview').hidden = false;
  $('importPreview').innerHTML = `<h3>${roster ? 'Student roster' : 'Class backup'} · ${escapeHTML(payload.className)}</h3><p>${payload.students.length} students${names ? ': ' + escapeHTML(names) : ''}${payload.students.length > 5 ? '…' : ''}</p>
    <p>${roster ? `${result.added} students will be added; ${result.skipped} already in your class will be skipped. Your comments and phrase bank will be kept.` : 'Restore replaces this class, including final comments and the phrase bank. You can undo after restoring.'}</p>
    <div class="actions"><button id="applyImport" class="button primary">${roster ? 'Add roster to my class' : 'Restore class backup'}</button>${roster ? '<button id="startFromRoster" class="button">Start class from roster</button>' : '<button id="importAsRoster" class="button">Import students only</button>'}</div>`;
  $('applyImport').onclick = () => applyImport(roster);
  if ($('importAsRoster')) $('importAsRoster').onclick = () => applyImport(true);
  if ($('startFromRoster')) $('startFromRoster').onclick = startFromRoster;
}
async function startFromRoster() {
  const payload = pendingImport;
  if (!payload || !await confirmAction('Start a class from this roster?', 'This replaces your students and their comments with the shared student list. Your phrase bank will be kept. Export a backup first to keep a separate copy, or undo after importing.', 'Start from roster')) return;
  snapshot('Started a class from the shared roster.');
  state.students = Core.mergeRoster([], payload.students).students;
  state.className = payload.className;
  currentId = state.students[0]?.id;
  pendingImport = null;
  $('shareDialog').close();
  save();
  setView('write');
  toast('Shared roster ready. Write your own comments for this class.');
}
async function applyImport(rosterOnly) {
  const payload = pendingImport;
  if (!payload) return;
  if (!rosterOnly && !await confirmAction('Restore this class backup?', 'This replaces your current class and phrase bank. Export a backup first if you want a separate copy. You can also undo this restore.', 'Restore backup')) return;
  snapshot(rosterOnly ? 'Roster imported. Existing comments were kept.' : 'Class backup restored.');
  if (rosterOnly) {
    const result = Core.mergeRoster(state.students, payload.students);
    state.students = result.students;
    if (!current()) currentId = state.students[0]?.id;
    if (undoState.students.length === 0) state.className = payload.className;
    toast(`${result.added} students added · ${result.skipped} already in your class.`);
  } else {
    state = { className: payload.className, students: payload.students, categories: payload.categories, categoryOrder: payload.categoryOrder, topicSettings: payload.topicSettings };
    currentId = state.students[0]?.id;
    resetBankDraft();
    toast('Class backup restored.');
  }
  pendingImport = null;
  $('shareDialog').close();
  save();
  setView(view);
}

document.querySelectorAll('[data-view]').forEach(button => { button.onclick = () => setView(button.dataset.view); });
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
  if (!s || Core.needsScore(s, state)) return;
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
$('copyFinal').onclick = async () => {
  const text = current()?.finalComment;
  if (!text?.trim()) return;
  try { await navigator.clipboard.writeText(text); toast('Final comment copied.'); }
  catch {
    $('finalText').focus();
    $('finalText').select();
    try {
      if (!document.execCommand('copy')) throw new Error('Copy unavailable');
      toast('Final comment copied.');
    } catch { toast('Comment selected. Press Ctrl+C or Command+C to copy.'); }
  }
};
$('markDone').onclick = () => {
  if (!current()?.finalComment.trim() || !current()?.fullName.trim()) return;
  current().status = 'Done';
  save();
  const index = state.students.findIndex(s => s.id === currentId);
  if (index < state.students.length - 1) moveStudent(1);
  else { updatePreview(); toast('Marked done. You’ve reached the last student.'); }
};
$('searchStudents').oninput = renderOverview;
$('searchRoster').oninput = renderRoster;
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
$('undoNotice').onmouseenter = () => clearTimeout(undoTimer);
$('undoNotice').onmouseleave = () => { if (!$('undoNotice').contains(document.activeElement)) scheduleUndoNotice(); };
$('undoNotice').onfocusin = () => clearTimeout(undoTimer);
$('undoNotice').onfocusout = () => scheduleUndoNotice();
$('changeBankOrder').onclick = () => {
  orderDraft = clone(bankDraft);
  draggedOrderIndex = null;
  const hasOptions = !!bankCategory && bankDraft.topicSettings[bankCategory].type !== 'value';
  $('orderScope').innerHTML = `<option value="topics">Topics</option>${hasOptions ? `<option value="options">Options for ${escapeHTML(bankCategory)}</option>` : ''}`;
  $('applyOrder').disabled = true;
  $('orderAnnouncement').textContent = '';
  renderOrderList();
  $('orderDialog').showModal();
  $('orderScope').focus();
};
$('orderScope').onchange = () => { clearOrderDrag(); renderOrderList(); };
$('cancelOrder').onclick = () => $('orderDialog').close();
$('orderDialog').onclose = () => { orderDraft = null; draggedOrderIndex = null; };
$('applyOrder').onclick = () => {
  if (!orderDraft) return;
  bankDraft = orderDraft;
  bankDirty = true;
  $('orderDialog').close();
  renderBank();
  $('changeBankOrder').focus();
};
for (const [id, offset] of [['previousBankTopic', -1], ['nextBankTopic', 1]]) $(id).onclick = () => {
  const next = bankDraft.categoryOrder[bankDraft.categoryOrder.indexOf(bankCategory) + offset];
  if (!next) return;
  bankCategory = next;
  renderBank();
  ($(id).disabled ? $('bankTopic') : $(id)).focus({preventScroll:true});
};
$('topicType').onchange = event => {
  bankDraft.topicSettings[bankCategory].type = event.target.value;
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
for (const [id, key] of Object.entries({valueType:'valueType', valueUnit:'unit', valueMin:'min', valueMax:'max', valuePhrase:'phrase'})) {
  const input = $(id);
  input.addEventListener(id === 'valueType' ? 'change' : 'input', () => {
    bankDraft.topicSettings[bankCategory][key] = input.value;
    bankDirty = true;
    updateBankStatus();
    if (id === 'valuePhrase') fitPhraseBox(input);
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
  bankDirty = true;
  $('categoryDialog').close();
  renderBank();
  $('phrase-0')?.focus();
};
$('addPhrase').onclick = () => {
  if (!bankCategory) return;
  if (bankDraft.categories[bankCategory].length >= 100) { toast('Each category can have up to 100 phrases.'); return; }
  bankDraft.categories[bankCategory].push({ phrase: '[PrefName] ', label: '' });
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
      if (next.type === 'value' && (previous.type !== 'value' || previous.phrase !== next.phrase || phrase === previous.phrase)) return [[cat, next.phrase]];
      const replacement = bankDraft.categories[cat]?.find(opt => opt.original === phrase);
      return replacement?.phrase.trim() ? [[cat, replacement.phrase.trim()]] : [];
    }));
  }
  activeCategory = validated.categoryOrder.find(cat => bankDraft.topicOrigins[cat] === activeCategory) || activeCategory;
  overviewCategory = validated.categoryOrder.find(cat => bankDraft.topicOrigins[cat] === overviewCategory) || overviewCategory;
  state.categories = validated.categories;
  state.categoryOrder = validated.categoryOrder;
  state.topicSettings = validated.topicSettings;
  resetBankDraft();
  save();
  renderBank();
  toast('Phrase bank saved. Final comments were kept.');
};
$('exportBank').onclick = () => {
  $('bankFileError').hidden = true;
  try {
    download(Core.exportBank(checkedBankDraft()), datedFilename('PhraseBank'));
    toast(bankDirty ? 'Bank exported, including unsaved edits.' : 'Bank exported.');
  } catch (error) { $('bankFileError').textContent = error.message; $('bankFileError').hidden = false; }
};
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
$('shareBtn').onclick = () => {
  pendingImport = null;
  $('importFile').value = '';
  $('importPreview').hidden = true;
  $('importError').hidden = true;
  $('exportRoster').disabled = !state.students.some(s => s.fullName.trim());
  $('shareDialog').showModal();
};
$('closeShare').onclick = () => $('shareDialog').close();
$('exportRoster').onclick = () => { download(Core.roster(state), datedFilename('StudentRoster')); toast('Roster exported. Your co-teacher can import this file.'); };
$('exportBackup').onclick = () => { download(Core.backup(state), datedFilename('ReportCardClass')); toast('Class backup exported.'); };
$('importFile').onchange = async event => {
  const file = event.target.files[0];
  pendingImport = null;
  $('importError').hidden = true;
  $('importPreview').hidden = true;
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('Choose a JSON file smaller than 10 MB.');
    const payload = JSON.parse(await file.text());
    previewImport(Core.validate(payload, state));
  } catch (error) {
    $('importError').textContent = error instanceof SyntaxError ? 'This is not valid JSON. Choose a roster or backup exported from this app.' : error.message;
    $('importError').hidden = false;
  }
};
window.addEventListener('beforeunload', event => {
  if (bankDirty) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('resize', () => {
  if (!$('bankView').hidden) $('bankView').querySelectorAll('textarea').forEach(fitPhraseBox);
});
resetBankDraft();
save();
renderWrite();
if (startupMessage) toast(startupMessage);
