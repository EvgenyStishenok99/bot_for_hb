const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Самый простой вебхук — просто логируем всё
app.post('/webhook', (req, res) => {
  console.log('✅ Получен запрос!');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// Для проверки работы сервера
app.get('/health', (req, res) => {
  res.send('OK');
});

app.get('/', (req, res) => {
  res.send('Simple bot server is running');
});

app.listen(PORT, () => {
  console.log(`🚀 Простой сервер запущен на порту ${PORT}`);
});