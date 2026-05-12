const TelegramBot = require('node-telegram-bot-api');
const db = require('./database');
require('dotenv').config();

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

// Функция для склонения слова "год"
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

// --- Команды бота ---
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🎉 *Привет! Я семейный бот-напоминалка с расчетом возраста!*

Я буду напоминать тебе о днях рождения и автоматически считать, сколько лет исполняется.

*Команды:*
/add Имя ГГГГ-ММ-ДД — добавить день рождения
/list — показать все дни рождения с возрастами
/next — показать ближайшие 7 дней рождений
/today — показать, у кого сегодня день рождения
/del Имя — удалить день рождения
/help — показать это сообщение

*Важно:* дату указывай в формате ГГГГ-ММ-ДД
    `;
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/add (.+?) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const name = match[1].trim();
  const dateStr = match[2].trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    bot.sendMessage(chatId, '❌ Формат: ГГГГ-ММ-ДД');
    return;
  }

  const birthDate = new Date(dateStr);
  if (isNaN(birthDate.getTime())) {
    bot.sendMessage(chatId, '❌ Неправильная дата');
    return;
  }

  try {
    db.addBirthday(name, dateStr, chatId.toString());
    const age = db.calculateAge(birthDate);
    bot.sendMessage(chatId, `✅ Добавлен *${name}*: ${formatDate(dateStr)}\n🎂 Возраст: ${age} ${getAgeWord(age)}`, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Ошибка при добавлении');
    console.error(error);
  }
});

bot.onText(/\/list/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const birthdays = db.getBirthdaysByChat(chatId.toString());
    if (birthdays.length === 0) {
      bot.sendMessage(chatId, '📭 Список пуст');
      return;
    }
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
    const birthdaysToday = allBirthdays.filter(b => b.birth_date.substring(5) === todayMonthDay && b.chat_id === chatId.toString());

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
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, '❌ Ошибка');
    console.error(error);
  }
});

bot.onText(/\/next/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const upcoming = db.getUpcomingBirthdays(chatId.toString(), 7);

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

bot.onText(/\/del (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const name = match[1].trim();
  try {
    const deleted = db.deleteBirthdayByName(name, chatId.toString());
    if (deleted > 0) {
      bot.sendMessage(chatId, `✅ Удален *${name}*`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `❌ Не найден *${name}*`, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    bot.sendMessage(chatId, '❌ Ошибка');
    console.error(error);
  }
});

// --- Минимальный веб-сервер для Render (чтобы не было таймаута) ---
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Веб-сервер для health check запущен на порту ${PORT}`);
});

console.log('🤖 Бот запущен в режиме polling и готов к работе!');