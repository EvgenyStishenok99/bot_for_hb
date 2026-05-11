const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'birthdays.db');
const db = new sqlite3.Database(dbPath);

// Инициализация таблицы (добавлено поле age)
db.run(`
    CREATE TABLE IF NOT EXISTS birthdays (
                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                             name TEXT NOT NULL,
                                             birth_date TEXT NOT NULL,
                                             chat_id TEXT NOT NULL,
                                             created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Добавить день рождения
function addBirthday(name, birthDate, chatId) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO birthdays (name, birth_date, chat_id) VALUES (?, ?, ?)',
      [name, birthDate, chatId],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Получить все дни рождения
function getAllBirthdays() {
  return new Promise((resolve, reject) => {
    db.all('SELECT name, birth_date, chat_id FROM birthdays', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Удалить день рождения по имени (только из текущего чата)
function deleteBirthdayByName(name, chatId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM birthdays WHERE name = ? AND chat_id = ?',
      [name, chatId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

// Получить все дни рождения для конкретного чата
function getBirthdaysByChat(chatId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT name, birth_date FROM birthdays WHERE chat_id = ? ORDER BY substr(birth_date, 6)',
      [chatId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Получить ближайшие дни рождения
function getUpcomingBirthdays(chatId, days = 7) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT name, birth_date FROM birthdays WHERE chat_id = ?',
      [chatId],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        const today = new Date();
        const upcoming = [];

        for (const row of rows) {
          const birthDate = new Date(row.birth_date);
          const nextBirthday = getNextBirthdayDate(birthDate, today);
          const daysDiff = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));

          if (daysDiff >= 0 && daysDiff <= days) {
            upcoming.push({
              name: row.name,
              birth_date: row.birth_date,
              daysUntil: daysDiff
            });
          }
        }

        // Сортируем по количеству дней до события
        upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
        resolve(upcoming);
      }
    );
  });
}

// Вычисление следующей даты дня рождения
function getNextBirthdayDate(birthDate, currentDate) {
  const nextBirthday = new Date(currentDate);
  nextBirthday.setFullYear(currentDate.getFullYear());
  nextBirthday.setMonth(birthDate.getMonth());
  nextBirthday.setDate(birthDate.getDate());

  if (nextBirthday < currentDate) {
    nextBirthday.setFullYear(currentDate.getFullYear() + 1);
  }

  return nextBirthday;
}

// Вычисление возраста
function calculateAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

module.exports = {
  addBirthday,
  getAllBirthdays,
  deleteBirthdayByName,
  getBirthdaysByChat,
  getUpcomingBirthdays,
  calculateAge,
  getNextBirthdayDate
};