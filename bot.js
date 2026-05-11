const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const db = require('./database');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Функция для склонения слова "год"
function getAgeWord(age) {
  const lastDigit = age % 10;
  const lastTwoDigits = age % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'лет';
  if (lastDigit === 1) return 'год';
  if (lastDigit >= 2 && lastDigit <= 4) return 'года';
  return 'лет';
}

// Форматирование даты для отображения
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🎉 *Привет! Я семейный бот-напоминалка с расчетом возраста!*

Я буду напоминать тебе о днях рождения и автоматически считать, сколько лет исполняется.

*Команды:*
/add Имя ГГГГ-ММ-ДД — добавить день рождения
   Пример: /add Мама 1975-03-15

/list — показать все дни рождения с возрастами

/next — показать ближайшие 7 дней рождений

/today — показать, у кого сегодня день рождения

/del Имя — удалить день рождения
   Пример: /del Мама

/help — показать это сообщение

*Важно:* дату указывай в формате ГГГГ-ММ-ДД
    `;
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Команда /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
📖 *Справка по командам:*

/add Имя ГГГГ-ММ-ДД — добавить день рождения
   Пример: /add Александр 1990-05-20

/list — показать ВСЕ дни рождения с текущим возрастом

/next — показать ближайшие дни рождения (7 дней)

/today — показать, у кого сегодня день рождения

/del Имя — удалить человека из списка

*Пример использования:*
1. Добавляем: /add Бабушка 1950-08-15
2. Смотрим список: /list
3. Узнаем ближайшие: /next
    `;
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

// Добавление дня рождения: /add Имя ГГГГ-ММ-ДД
  bot.onText(/\/add (.+?) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const name = match[1].trim();
    const dateStr = match[2].trim();

    // Проверка формата даты
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      bot.sendMessage(chatId, '❌ Неправильный формат даты! Используй ГГГГ-ММ-ДД (например: 1990-05-20)');
      return;
    }

    // Проверка, что дата реальная
    const birthDate = new Date(dateStr);
    if (isNaN(birthDate.getTime())) {
      bot.sendMessage(chatId, '❌ Неправильная дата! Проверь, что день и месяц существуют.');
      return;
    }

    // Проверка, что дата не в будущем
    if (birthDate > new Date()) {
      bot.sendMessage(chatId, '❌ Дата рождения не может быть в будущем!');
      return;
    }

    try {
      await db.addBirthday(name, dateStr, chatId);
      const age = db.calculateAge(birthDate);
      bot.sendMessage(
        chatId,
        `✅ Добавлен *${name}*: ${formatDate(dateStr)}\n🎂 Сейчас ей/ему *${age} ${getAgeWord(age)}*`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      bot.sendMessage(chatId, '❌ Ошибка при добавлении. Попробуй еще раз.');
      console.error(error);
    }
  });

// Показать список всех дней рождений с возрастами
  bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const birthdays = await db.getBirthdaysByChat(chatId);

      if (birthdays.length === 0) {
        bot.sendMessage(chatId, '📭 Список дней рождений пуст. Добавь командой /add Имя ГГГГ-ММ-ДД');
        return;
      }

      let message = '*🎂 Ваши дни рождения:*\n\n';

      birthdays.forEach(b => {
        const birthDate = new Date(b.birth_date);
        const age = db.calculateAge(birthDate);
        const ageText = `${age} ${getAgeWord(age)}`;

        message += `• *${b.name}*\n`;
        message += `   📅 ${formatDate(b.birth_date)}\n`;
        message += `   🎂 ${ageText}\n\n`;
      });

      // Добавляем статистику
      message += `📊 *Всего:* ${birthdays.length} человек`;

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, '❌ Ошибка при получении списка');
      console.error(error);
    }
  });

// Показать ближайшие дни рождения
  bot.onText(/\/next/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const upcoming = await db.getUpcomingBirthdays(chatId, 7);

      if (upcoming.length === 0) {
        bot.sendMessage(chatId, '📭 В ближайшие 7 дней нет дней рождений');
        return;
      }

      let message = '🎯 *Ближайшие дни рождения:*\n\n';

      for (const b of upcoming) {
        const birthDate = new Date(b.birth_date);
        const nextAge = db.calculateAge(birthDate) + 1;

        if (b.daysUntil === 0) {
          message += `🎉 *СЕГОДНЯ!* 🎉\n`;
          message += `   *${b.name}* исполняется *${nextAge} ${getAgeWord(nextAge)}*\n\n`;
        } else if (b.daysUntil === 1) {
          message += `⭐ *ЗАВТРА!* ⭐\n`;
          message += `   *${b.name}* исполнится *${nextAge} ${getAgeWord(nextAge)}*\n\n`;
        } else {
          message += `📅 *Через ${b.daysUntil} дней*\n`;
          message += `   *${b.name}* исполнится *${nextAge} ${getAgeWord(nextAge)}*\n`;
          message += `   📆 ${formatDate(b.birth_date)}\n\n`;
        }
      }

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, '❌ Ошибка при получении списка');
      console.error(error);
    }
  });

// Показать сегодняшние дни рождения
  bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const upcoming = await db.getUpcomingBirthdays(chatId, 0);

      if (upcoming.length === 0) {
        bot.sendMessage(chatId, '🎁 Сегодня нет дней рождений');
        return;
      }

      let message = '🎉 *СЕГОДНЯ ДЕНЬ РОЖДЕНИЯ!* 🎉\n\n';

      for (const b of upcoming) {
        const birthDate = new Date(b.birth_date);
        const age = db.calculateAge(birthDate);
        message += `🎂 *${b.name}* — *${age} ${getAgeWord(age)}* 🎂\n`;
        message += `Не забудь поздравить! 🎁\n\n`;
      }

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, '❌ Ошибка при получении списка');
      console.error(error);
    }
  });

// Удаление дня рождения: /del Имя
  bot.onText(/\/del (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const name = match[1].trim();

    try {
      const deleted = await db.deleteBirthdayByName(name, chatId);

      if (deleted > 0) {
        bot.sendMessage(chatId, `✅ Удален день рождения *${name}*`, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, `❌ Не найден день рождения для *${name}*`, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      bot.sendMessage(chatId, '❌ Ошибка при удалении');
      console.error(error);
    }
  });

// Функция проверки дней рождений (для автоматических напоминаний)
  async function checkBirthdays() {
    console.log('🔍 Проверка дней рождений...', new Date().toLocaleString('ru-RU'));

    try {
      const allBirthdays = await db.getAllBirthdays();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Группируем по chat_id
      const birthdaysByChat = {};

      for (const b of allBirthdays) {
        const birthDateStr = b.birth_date;
        const birthMonthDay = birthDateStr.substring(5); // ММ-ДД
        const todayMonthDay = todayStr.substring(5); // ММ-ДД

        if (birthMonthDay === todayMonthDay) {
          if (!birthdaysByChat[b.chat_id]) {
            birthdaysByChat[b.chat_id] = [];
          }
          birthdaysByChat[b.chat_id].push(b);
        }
      }

      // Отправляем уведомления
      for (const [chatId, birthdays] of Object.entries(birthdaysByChat)) {
        let message = '🎉 *СЕГОДНЯ ДЕНЬ РОЖДЕНИЯ!* 🎉\n\n';

        for (const b of birthdays) {
          const birthDate = new Date(b.birth_date);
          const age = db.calculateAge(birthDate);
          message += `🎂 *${b.name}* — *${age} ${getAgeWord(age)}* 🎂\n`;
        }

        message += '\n✨ Поздравь именинника(цу)! ✨\n';
        message += '🎁 Пожелай счастья, здоровья и успехов! 🎁';

        try {
          await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
          console.log(`✅ Отправлено напоминание в чат ${chatId}`);
        } catch (error) {
          console.error(`❌ Ошибка отправки в чат ${chatId}:`, error);
        }
      }

      if (Object.keys(birthdaysByChat).length === 0) {
        console.log('📭 Сегодня нет дней рождений');
      }
    } catch (error) {
      console.error('❌ Ошибка при проверке:', error);
    }
  }

// Запускаем ежедневную проверку в 9:00
  schedule.scheduleJob('0 9 * * *', checkBirthdays);

// Дополнительно: проверка в 12:00 и 18:00 (на всякий случай)
  schedule.scheduleJob('0 12 * * *', checkBirthdays);
  schedule.scheduleJob('0 18 * * *', checkBirthdays);

// Для тестирования (раскомментировать при необходимости)
// setTimeout(checkBirthdays, 5000);

  console.log('🤖 Бот запущен и работает...');
  console.log('⏰ Проверка дней рождений: 9:00, 12:00, 18:00');
  console.log('✨ Автоматический расчет возраста включен');