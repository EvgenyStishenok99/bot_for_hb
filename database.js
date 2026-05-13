// database.js - фиксированный список дней рождений
// Без подписок, просто данные

const birthdaysData = [
  { name: "Тётя_Лиля", birth_date: "1950-01-05" },
  { name: "Дядя_Саша", birth_date: "1973-01-06" },
  { name: "Ира_Богатова", birth_date: "1987-01-08" },
  { name: "Ульяна", birth_date: "2008-01-10" },
  { name: "Жэка", birth_date: "1999-02-02" },
  { name: "Тётя_Аня", birth_date: "1979-02-08" },
  { name: "Бабушка_Рая", birth_date: "1951-03-30" },
  { name: "Таня_Яновская", birth_date: "1998-04-02" },
  { name: "Кушнирук_Юра", birth_date: "1984-04-17" },
  { name: "Дядя_Ваня", birth_date: "1952-04-25" },
  { name: "Витюша", birth_date: "2014-05-06" },
  { name: "Дима_Стишенок", birth_date: "1995-05-07" },
  { name: "Анжела", birth_date: "1963-05-29" },
  { name: "Олег", birth_date: "2010-05-31" },
  { name: "Отец", birth_date: "1975-06-03" },
  { name: "Дима_Раевский", birth_date: "2000-06-09" },
  { name: "Яновская_Юля", birth_date: "1975-07-01" },
  { name: "Стишенок_Галя", birth_date: "1971-07-06" },
  { name: "Мать", birth_date: "1976-08-02" },
  { name: "Игорь_Кукушкин", birth_date: "1974-08-19" },
  { name: "полинка", birth_date: "2006-08-23" },
  { name: "Раевский_Коля", birth_date: "1966-11-10" },
  { name: "Богатов_Вадик", birth_date: "1987-11-12" },
  { name: "Вероника_Стишенок", birth_date: "1999-11-17" },
  { name: "Лариса", birth_date: "1962-11-28" },
  { name: "Дедушка_Костя", birth_date: "1947-12-01" }
];

// СЮДА ВСТАВЬТЕ chat_id вашего семейного чата (цифру)
const FAMILY_CHAT_ID = 000000000;  // ← ЗАМЕНИТЕ НА РЕАЛЬНЫЙ chat_id!

function getAllBirthdays() {
  return birthdaysData;
}

function getBirthdaysByChat(chatId) {
  return birthdaysData;
}

function getFamilyChatId() {
  return FAMILY_CHAT_ID;
}

function addBirthday() { return null; }
function deleteBirthdayByName() { return 0; }

function calculateAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getUpcomingBirthdays(days = 7) {
  const today = new Date();
  const upcoming = [];

  for (const b of birthdaysData) {
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
  getAllBirthdays,
  getBirthdaysByChat,
  getFamilyChatId,
  calculateAge,
  getUpcomingBirthdays,
  addBirthday,
  deleteBirthdayByName
};