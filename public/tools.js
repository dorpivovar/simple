// Описания функций для Gemini. Сами функции находятся в app.js и выполняются в браузере.
const status = { type: 'string', enum: ['todo', 'doing', 'done'] };
const title = { type: 'string', minLength: 1, maxLength: 100 };
const id = { type: 'string', description: 'Точный id из переданного списка задач' };

export const TOOLS = [
  {
    name: 'list_cards',
    description: 'Показать пользователю текущий список задач.',
    parametersJsonSchema: { type: 'object', properties: {} },
  },
  {
    name: 'add_card',
    description: 'Создать задачу. По умолчанию status = todo. Можно сразу указать doing или done.',
    parametersJsonSchema: {
      type: 'object', properties: { title, status }, required: ['title'],
    },
  },
  {
    name: 'update_card',
    description: 'Изменить название или статус существующей задачи. Передай id и хотя бы одно поле: title или status.',
    parametersJsonSchema: {
      type: 'object', properties: { id, title, status }, required: ['id'],
    },
  },
  {
    name: 'delete_card',
    description: 'Удалить существующую задачу по точному id.',
    parametersJsonSchema: {
      type: 'object', properties: { id }, required: ['id'],
    },
  },
];
