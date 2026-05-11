const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.BOT_TOKEN;

// Настройка базы данных (SQLite будет работать, но помните — на Render'e файл БД не сохраняется между перезапусками!)
const dbPath = path.join(__dirname, 'birthdays.db');
const db = new sqlite3.Database(dbPath);

// Инициализация БД (код из вашего database.js)
db.run(`
    CREATE TABLE IF NOT EXISTS birthdays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Функции работы с БД (скопируйте сюда все функции из database.js)
// addBirthday, getBirthdaysByChat, calculateAge и т.д...

// Создаем бота с webhook
const bot = new TelegramBot(TOKEN);

// Устанавливаем webhook
const WEBHOOK_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook`;
bot.setWebHook(WEBHOOK_URL).then(() => {
  console.log(`✅ Webhook установлен: ${WEBHOOK_URL}`);
}).catch(err => console.error('Ошибка webhook:', err));

// Webhook endpoint для Telegram
app.use(express.json());
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Health check для Render (важно для бесплатного тарифа!)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Обработчики команд (перенесите все ваши bot.onText сюда)
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '🎉 Привет! Я бот-напоминалка о днях рождения!');
});

bot.onText(/\/add (.+?) (.+)/, async (msg, match) => {
  // Ваш код добавления дня рождения
});

bot.onText(/\/list/, async (msg) => {
  // Ваш код показа списка
});

bot.onText(/\/del (.+)/, async (msg, match) => {
  // Ваш код удаления
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});