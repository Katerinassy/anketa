require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Директории
const APPLICATIONS_DIR = path.resolve(__dirname, 'internship_applications');
const TEMP_UPLOADS_DIR = path.resolve(__dirname, 'temp_uploads');

// Проверка путей при старте
console.log('Текущая директория:', __dirname);
console.log('APPLICATIONS_DIR:', APPLICATIONS_DIR);
console.log('TEMP_UPLOADS_DIR:', TEMP_UPLOADS_DIR);

// Конфигурация Multer
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(TEMP_UPLOADS_DIR, { recursive: true });
            console.log(`Временная папка создана/существует: ${TEMP_UPLOADS_DIR}`);
            cb(null, TEMP_UPLOADS_DIR);
        } catch (err) {
            console.error('Ошибка при создании временной папки:', err);
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
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
app.use(cors({
    origin: '*', // Разрешаем все источники для тестов (замените на конкретные порты в продакшене)
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Создание директорий при старте
(async () => {
    try {
        await fs.mkdir(APPLICATIONS_DIR, { recursive: true });
        await fs.mkdir(TEMP_UPLOADS_DIR, { recursive: true });
        console.log(`Директории созданы: ${APPLICATIONS_DIR}, ${TEMP_UPLOADS_DIR}`);
    } catch (err) {
        console.error('Ошибка при создании директорий:', err);
        process.exit(1);
    }
})();

// API Endpoint
app.post('/api/application', upload.single('photo'), async (req, res) => {
    try {
        console.log('=== Начало обработки запроса /api/application ===');
        console.log('Данные формы:', JSON.stringify(req.body, null, 2));
        console.log('Файл:', req.file);

        // Проверка обязательных полей
        if (!req.body.fullName || !req.body.phone) {
            console.log('Ошибка: отсутствует fullName или phone');
            return res.status(400).json({ 
                error: 'Необходимо указать ФИО и контактный телефон' 
            });
        }

        // Создание уникального имени папки
        const studentName = req.body.fullName
            .replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')
            .toLowerCase();
        const timestamp = Date.now();
        const studentDir = path.join(APPLICATIONS_DIR, `${studentName}_${timestamp}`);
        console.log('Попытка создать папку:', studentDir);

        // Создание папки
        await fs.mkdir(studentDir, { recursive: true });
        console.log('Папка создана:', studentDir);

        // Проверка существования папки
        const dirExists = await fs.access(studentDir).then(() => true).catch(() => false);
        console.log('Папка существует:', dirExists);

        // Обработка фото
        let photoPath = null;
        if (req.file) {
            const photoExt = path.extname(req.file.originalname).toLowerCase() || '.jpg';
            photoPath = path.join(studentDir, `photo${photoExt}`);
            console.log('Перемещение фото:', req.file.path, '->', photoPath);
            await fs.rename(req.file.path, photoPath);
            console.log('Фото перемещено:', photoPath);
            // Проверка существования фото
            const photoExists = await fs.access(photoPath).then(() => true).catch(() => false);
            console.log('Фото существует:', photoExists);
        } else {
            console.log('Фото не загружено');
        }

        // Сохранение JSON
        const jsonData = {
            ...req.body,
            photo: photoPath ? `photo${path.extname(photoPath)}` : null,
            submittedAt: new Date().toISOString()
        };
        const jsonPath = path.join(studentDir, 'application.json');
        console.log('Сохранение JSON:', jsonPath);
        await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
        console.log('JSON сохранен:', jsonPath);

        // Проверка существования JSON
        const jsonExists = await fs.access(jsonPath).then(() => true).catch(() => false);
        console.log('JSON существует:', jsonExists);

        // Проверка содержимого папки
        const dirContents = await fs.readdir(studentDir).catch(() => []);
        console.log('Содержимое папки:', dirContents);

        console.log('=== Завершение обработки запроса ===');
        res.status(201).json({ 
            success: true,
            message: 'Анкета успешно сохранена',
            applicationId: `${studentName}_${timestamp}`,
            path: studentDir
        });
    } catch (error) {
        console.error('Ошибка при сохранении анкеты:', error);
        // Очистка временного файла
        if (req.file && await fs.access(req.file.path).then(() => true).catch(() => false)) {
            await fs.unlink(req.file.path).catch(err => console.error('Ошибка при удалении временного файла:', err));
        }
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка:', err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Ошибка загрузки файла: ' + err.message });
    }
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту http://localhost:${PORT}`);
    console.log(`Папка для анкет: ${APPLICATIONS_DIR}`);
    console.log(`Временная папка для загрузок: ${TEMP_UPLOADS_DIR}`);
});