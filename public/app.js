import { TOOLS } from './tools.js';

// Все задачи находятся в браузере. После перезагрузки страницы массив создаётся заново.
let cards = [
  { id: crypto.randomUUID(), title: 'Выучить JavaScript', status: 'todo' },
  { id: crypto.randomUUID(), title: 'Разобраться с Function Calling', status: 'doing' },
  { id: crypto.randomUUID(), title: 'Запустить проект', status: 'done' },
];
const statuses = { todo: 'Нужно сделать', doing: 'В работе', done: 'Готово' };
const form = document.querySelector('#form');
const title = document.querySelector('#title');
const status = document.querySelector('#status');
const save = document.querySelector('#save');
const cancel = document.querySelector('#cancel');
const formLabel = document.querySelector('#form-label');
const error = document.querySelector('#error');
const chatForm = document.querySelector('#chat-form');
const command = document.querySelector('#command');
const send = document.querySelector('#send');
const sendLabel = document.querySelector('#send-label');
const reply = document.querySelector('#reply');
let editingId = null;

function checkTitle(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 100) {
    throw new Error('Введите название от 1 до 100 символов.');
  }
  return value.trim();
}

function checkStatus(value) {
  if (!Object.hasOwn(statuses, value)) throw new Error('Неизвестный статус задачи.');
  return value;
}

function addCard({ title, status = 'todo' }) {
  const card = { id: crypto.randomUUID(), title: checkTitle(title), status: checkStatus(status) };
  cards.push(card);
  render();
  return `Создана задача «${card.title}» — ${statuses[card.status]}.`;
}

function updateCard({ id, title, status }) {
  const card = cards.find(card => card.id === id);
  if (!card) throw new Error('Задача не найдена.');
  if (title === undefined && status === undefined) throw new Error('Укажи новое название или статус.');
  const nextTitle = title === undefined ? card.title : checkTitle(title);
  const nextStatus = status === undefined ? card.status : checkStatus(status);
  card.title = nextTitle;
  card.status = nextStatus;
  render();
  return `Задача «${card.title}» обновлена — ${statuses[card.status]}.`;
}

function deleteCard({ id }) {
  const card = cards.find(card => card.id === id);
  if (!card) throw new Error('Задача не найдена.');
  cards = cards.filter(card => card.id !== id);
  if (editingId === id) resetForm();
  render();
  return `Удалена задача «${card.title}».`;
}

// Диспетчер выполняет только заранее написанные функции, которые выбрала модель.
function executeTool(name, args = {}) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Неверные параметры функции.');
  switch (name) {
    case 'list_cards': return cards.map(card => `${card.title} — ${statuses[card.status]}`).join('\n') || 'Задач пока нет.';
    case 'add_card': return addCard(args);
    case 'update_card': return updateCard(args);
    case 'delete_card': return deleteCard(args);
    default: throw new Error(`Неизвестная функция: ${name}`);
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  save.textContent = 'Добавить';
  formLabel.textContent = 'Новая задача';
  cancel.hidden = true;
}
cancel.onclick = resetForm;

function render() {
  error.textContent = '';
  for (const state of Object.keys(statuses)) {
    const list = document.getElementById(state);
    list.replaceChildren();
    for (const item of cards.filter(card => card.status === state)) {
      const card = document.createElement('article');
      const text = document.createElement('p');
      text.textContent = item.title;
      const edit = document.createElement('button');
      edit.textContent = 'Изменить';
      edit.onclick = () => {
        editingId = item.id;
        title.value = item.title;
        status.value = item.status;
        save.textContent = 'Сохранить';
        formLabel.textContent = 'Изменить задачу';
        cancel.hidden = false;
        title.focus();
      };
      const remove = document.createElement('button');
      remove.textContent = 'Удалить';
      remove.className = 'delete';
      remove.onclick = () => deleteCard({ id: item.id });
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.append(edit, remove);
      card.append(text, actions);
      list.append(card);
    }
    if (!list.children.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Задач пока нет';
      list.append(empty);
    }
  }
}

form.onsubmit = event => {
  event.preventDefault();
  try {
    const fields = { title: title.value, status: status.value };
    if (editingId) updateCard({ id: editingId, ...fields });
    else addCard(fields);
    resetForm();
  } catch (err) {
    error.textContent = err.message;
  }
};

chatForm.onsubmit = async event => {
  event.preventDefault();
  if (send.disabled) return;
  if (!command.value.trim()) { reply.dataset.state = 'error'; reply.textContent = 'Напиши команду.'; return; }
  send.disabled = true;
  command.readOnly = true;
  chatForm.setAttribute('aria-busy', 'true');
  sendLabel.textContent = 'Выполняю…';
  reply.dataset.state = 'loading';
  reply.textContent = 'Gemini выбирает действие…';
  try {
    // Единственный запрос: команда + текущие задачи + описания функций.
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: command.value.trim(), cards, tools: TOOLS }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    const calls = result.toolCalls || [];
    const messages = [];
    let failed = false;
    for (const call of calls) {
      try { messages.push(executeTool(call.name, call.args)); }
      catch (err) { messages.push(`Ошибка: ${err.message}`); failed = true; }
    }
    // Показываем фактический результат локальных функций, не запрашивая модель повторно.
    reply.textContent = calls.length ? messages.join('\n') : result.text || 'Модель не выбрала действие.';
    reply.dataset.state = failed ? 'error' : 'success';
    if (!failed) chatForm.reset();
  } catch (err) {
    reply.textContent = err.message;
    reply.dataset.state = 'error';
  } finally {
    send.disabled = false;
    command.readOnly = false;
    chatForm.removeAttribute('aria-busy');
    sendLabel.textContent = 'Выполнить';
  }
};

command.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    if (!send.disabled) chatForm.requestSubmit();
  }
});

render();
