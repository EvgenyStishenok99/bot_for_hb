const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'birthdays.json');

// Загрузка данных из файла
function loadData() {
  if (!fs.existsSync(dbPath)) {
    return [];
  }
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
}

// Сохранение данных в файл
function saveData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Добавить день рождения
function addBirthday(name, birthDate, chatId) {
  const data = loadData();
  data.push({
    name: name,
    birth_date: birthDate,
    chat_id: chatId,
    id: Date.now(),
    created_at: new Date().toISOString()
  });
  saveData(data);
  return { lastInsertRowid: Date.now() };
}

// Получить все дни рождения
function getAllBirthdays() {
  return loadData();
}

// Получить дни рождения по чату
function getBirthdaysByChat(chatId) {
  const data = loadData();
  return data.filter(b => b.chat_id === chatId);
}

// Удалить день рождения
function deleteBirthdayByName(name, chatId) {
  const data = loadData();
  const filtered = data.filter(b => !(b.name === name && b.chat_id === chatId));
  const deleted = data.length - filtered.length;
  saveData(filtered);
  return deleted;
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

// Получить ближайшие дни рождения (для команды /next)
function getUpcomingBirthdays(chatId, days = 7) {
  const data = loadData();
  const chatBirthdays = data.filter(b => b.chat_id === chatId);
  const today = new Date();
  const upcoming = [];

  for (const b of chatBirthdays) {
    const birthDate = new Date(b.birth_date);
    const nextBirthday = new Date(today);
    nextBirthday.setFullYear(today.getFullYear());
    nextBirthday.setMonth(birthDate.getMonth());
    nextBirthday.setDate(birthDate.getDate());

    if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }

    const daysDiff = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
    if (daysDiff >= 0 && daysDiff <= days) {
      upcoming.push({
        name: b.name,
        birth_date: b.birth_date,
        daysUntil: daysDiff
      });
    }
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming;
}

module.exports = {
  addBirthday,
  getAllBirthdays,
  deleteBirthdayByName,
  getBirthdaysByChat,
  calculateAge,
  getUpcomingBirthdays
};