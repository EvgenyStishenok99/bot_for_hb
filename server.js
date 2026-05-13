const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const db = require('./database');
require('dotenv').config();

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

const FAMILY_CHAT_ID = db.getFamilyChatId();

function getAgeWord(age) {
  const lastDigit = age % 10;
  const lastTwoDigits = age % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'лет';
  if (lastDigit === 1) return 'год';
  if (lastDigit >= 2 && lastDigit <= 4) return 'года';
  return 'лет';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// --- КОМАНДА ДЛЯ УЗНАВАНИЯ CHAT_ID (временная) ---
// Отправьте эту команду в СЕМЕЙНОМ ЧАТЕ, чтобы узнать его ID
bot.onText(/\/chatid/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Chat ID этого чата: \`${chatId}\``, { parse_mode: 'Markdown' });
  console.log(`Chat ID запрошен: ${chatId}`);
});

// --- Функция отправки напоминания в семейный чат ---
async function sendBirthdayReminder() {
  console.log('🔍 Проверка дней рождений...', new Date().toLocaleString('ru-RU'));

  try {
    const allBirthdays = db.getAllBirthdays();
    const now = new Date();
    const todayMonthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const birthdaysToday = allBirthdays.filter(b => b.birth_date.substring(5) === todayMonthDay);

    if (birthdaysToday.length === 0) {
      console.log('📭 Сегодня дней рождений нет');
      return;
    }

    if (!FAMILY_CHAT_ID || FAMILY_CHAT_ID === 0) {
      console.log('⚠️ ВНИМАНИЕ: FAMILY_CHAT_ID не настроен! Узнайте chat_id командой /chatid в семейном чате и добавьте его в database.js');
      return;
    }

    let message = '🎉 *СЕГОДНЯ ДЕНЬ РОЖДЕНИЯ!* 🎉\n\n';
    birthdaysToday.forEach(b => {
      const birthDate = new Date(b.birth_date);
      const age = db.calculateAge(birthDate);
      message += `🎂 *${b.name}* — ${age} ${getAgeWord(age)} 🎂\n`;
    });
    message += '\n✨ Не забудьте поздравить! ✨';

    await bot.sendMessage(FAMILY_CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log(`✅ Напоминание отправлено в семейный чат ${FAMILY_CHAT_ID}`);

  } catch (error) {
    console.error('❌ Ошибка при отправке напоминания:', error);
  }
}

// --- Ежедневная проверка в 8:00 утра по МОСКВЕ ---
schedule.scheduleJob('0 5 * * *', sendBirthdayReminder);
console.log('⏰ Напоминания настроены на 8:00 по московскому времени');

// --- Команды бота ---
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🎉 *Привет! Я семейный бот-напоминалка!*

Каждый день в 8:00 утра я буду присылать в этот чат список именинников.

*Команды:*
/list — показать все дни рождения
/next — показать ближайшие 7 дней
/today — показать, у кого сегодня день рождения
/chatid — узнать ID этого чата (для настройки)

Все дни рождения родственников уже добавлены в мою базу!
    `;
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/list/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const birthdays = db.getAllBirthdays();
    let message = '🎂 *Список дней рождений:*\n\n';
    birthdays.forEach(b => {
      const birthDate = new Date(b.birth_date);
      const age = db.calculateAge(birthDate);
      message += `• *${b.name}*\n   📅 ${formatDate(b.birth_date)}\n   🎂 ${age} ${getAgeWord(age)}\n\n`;
    });
    message += `📊 *Всего:* ${birthdays.length} человек`;
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Ошибка');
    console.error(error);
  }
});

bot.onText(/\/today/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const allBirthdays = db.getAllBirthdays();
    const today = new Date();
    const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const birthdaysToday = allBirthdays.filter(b => b.birth_date.substring(5) === todayMonthDay);

    if (birthdaysToday.length === 0) {
      bot.sendMessage(chatId, '🎁 Сегодня нет дней рождений');
      return;
    }

    let message = '🎉 *СЕГОДНЯ ДЕНЬ РОЖДЕНИЯ!* 🎉\n\n';
    birthdaysToday.forEach(b => {
      const birthDate = new Date(b.birth_date);
      const age = db.calculateAge(birthDate);
      message += `🎂 *${b.name}* — ${age} ${getAgeWord(age)} 🎂\n`;
    });
    message += '\n✨ Не забудьте поздравить! ✨';
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Ошибка');
    console.error(error);
  }
});

bot.onText(/\/next/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const upcoming = db.getUpcomingBirthdays(7);

    if (upcoming.length === 0) {
      bot.sendMessage(chatId, '📭 В ближайшие 7 дней нет дней рождений');
      return;
    }

    let message = '🎯 *Ближайшие дни рождения:*\n\n';
    upcoming.forEach(u => {
      const birthDate = new Date(u.birth_date);
      const nextAge = db.calculateAge(birthDate) + 1;

      if (u.daysUntil === 0) {
        message += `🎉 *СЕГОДНЯ!* ${u.name} — ${nextAge} ${getAgeWord(nextAge)}\n\n`;
      } else if (u.daysUntil === 1) {
        message += `⭐ *ЗАВТРА!* ${u.name} — ${nextAge} ${getAgeWord(nextAge)}\n\n`;
      } else {
        message += `📅 *Через ${u.daysUntil} дней:* ${u.name} — ${nextAge} ${getAgeWord(nextAge)}\n`;
      }
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Ошибка');
    console.error(error);
  }
});

// --- Веб-сервер для Render ---
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Веб-сервер запущен на порту ${PORT}`);
});

console.log('🤖 Семейный бот запущен!');
console.log(`📋 В базе ${db.getAllBirthdays().length} дней рождений`);
console.log(`⏰ Напоминания каждый день в 8:00 по Москве`);