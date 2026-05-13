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

    let message = '🎉 *СЕГОДНЯ ДЕНЬ РОЖДЕНИЯ!* 🎉\n\n';
    birthdaysToday.forEach(b => {
      const birthDate = new Date(b.birth_date);
      const age = db.calculateAge(birthDate);
      message += `🎂 *${b.name}* — ${age} ${getAgeWord(age)} 🎂\n`;
    });
    message += '\n✨ Не забудьте поздравить! ✨';

    await bot.sendMessage(FAMILY_CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log(`✅ Напоминание отправлено в чат ${FAMILY_CHAT_ID}`);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Планировщик в 8:00 МСК (5:00 UTC)
schedule.scheduleJob('0 5 * * *', sendBirthdayReminder);
console.log('⏰ Напоминания настроены на 8:00 по московскому времени');

// --- Команды ---
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🎉 *Семейный бот-напоминалка!*\n\n/list — все дни рождения\n/today — кто сегодня\n/next — ближайшие 7 дней`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/list/, (msg) => {
  const birthdays = db.getAllBirthdays();
  let message = '🎂 *Список дней рождений:*\n\n';
  birthdays.forEach(b => {
    const birthDate = new Date(b.birth_date);
    const age = db.calculateAge(birthDate);
    message += `• *${b.name}*\n   📅 ${formatDate(b.birth_date)}\n   🎂 ${age} ${getAgeWord(age)}\n\n`;
  });
  message += `📊 *Всего:* ${birthdays.length} человек`;
  bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
});

bot.onText(/\/today/, (msg) => {
  const allBirthdays = db.getAllBirthdays();
  const today = new Date();
  const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const birthdaysToday = allBirthdays.filter(b => b.birth_date.substring(5) === todayMonthDay);

  if (birthdaysToday.length === 0) {
    bot.sendMessage(msg.chat.id, '🎁 Сегодня нет дней рождений');
    return;
  }

  let message = '🎉 *СЕГОДНЯ ДЕНЬ РОЖДЕНИЯ!* 🎉\n\n';
  birthdaysToday.forEach(b => {
    const birthDate = new Date(b.birth_date);
    const age = db.calculateAge(birthDate);
    message += `🎂 *${b.name}* — ${age} ${getAgeWord(age)} 🎂\n`;
  });
  bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
});

bot.onText(/\/next/, (msg) => {
  const upcoming = db.getUpcomingBirthdays(7);

  if (upcoming.length === 0) {
    bot.sendMessage(msg.chat.id, '📭 В ближайшие 7 дней нет дней рождений');
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
  bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
});

// --- Минимальный веб-сервер для Render (чтобы не было таймаута) ---
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`✅ Health check сервер запущен на порту ${PORT}`);
});

console.log('🤖 Бот запущен в режиме polling и готов к работе!');