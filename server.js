require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Используем абсолютный путь для папки с анкетами
const APPLICATIONS_DIR = path.resolve(__dirname, 'internship_applications');
const TEMP_UPLOADS_DIR = path.resolve(__dirname, 'temp_uploads');

// Конфигурация Multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Убедимся, что временная папка существует
    fs.mkdirSync(TEMP_UPLOADS_DIR, { recursive: true });
    cb(null, TEMP_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Разрешены только изображения (jpeg, jpg, png, gif)'));
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Создание необходимых директорий при запуске
try {
  fs.mkdirSync(APPLICATIONS_DIR, { recursive: true });
  fs.mkdirSync(TEMP_UPLOADS_DIR, { recursive: true });
  console.log(`Директории созданы: ${APPLICATIONS_DIR}, ${TEMP_UPLOADS_DIR}`);
} catch (err) {
  console.error('Ошибка при создании директорий:', err);
}

// API Endpoints

// Сохранение новой анкеты (основной обработчик)
app.post('/api/application', upload.single('photo'), async (req, res) => {
  try {
    // Валидация обязательных полей
    if (!req.body.fullName || !req.body.phone) {
      return res.status(400).json({ 
        error: 'Необходимо указать ФИО и контактный телефон' 
      });
    }

    // Создание уникального имени папки для студента
    const studentName = req.body.fullName
      .replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')
      .toLowerCase();
    
    const timestamp = Date.now();
    const studentDir = path.join(APPLICATIONS_DIR, `${studentName}_${timestamp}`);

    // Создаем папку для анкеты
    try {
      fs.mkdirSync(studentDir, { recursive: true });
    } catch (err) {
      console.error('Ошибка при создании папки:', err);
      return res.status(500).json({ error: 'Не удалось создать папку для анкеты' });
    }

    // Обработка фото (если есть)
    if (req.file) {
      try {
        const photoExt = path.extname(req.file.originalname) || '.jpg';
        const newPhotoPath = path.join(studentDir, `photo${photoExt}`);
        fs.renameSync(req.file.path, newPhotoPath);
      } catch (err) {
        console.error('Ошибка при сохранении фото:', err);
        // Продолжаем без фото, если не удалось сохранить
      }
    } else {
      // Удаляем временный файл, если фото не требуется
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    // Сохранение данных анкеты в JSON
    const jsonData = JSON.stringify({
      ...req.body,
      submittedAt: new Date().toISOString()
    }, null, 2);

    fs.writeFileSync(path.join(studentDir, 'application.json'), jsonData, 'utf8');

    res.status(201).json({ 
      success: true,
      message: 'Анкета успешно сохранена',
      applicationId: `${studentName}_${timestamp}`,
      path: studentDir
    });

  } catch (error) {
    console.error('Ошибка при сохранении анкеты:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Другие обработчики API...

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту http://localhost:${PORT}`);
  console.log(`Папка для анкет: ${APPLICATIONS_DIR}`);
  console.log(`Временная папка для загрузок: ${TEMP_UPLOADS_DIR}`);
});