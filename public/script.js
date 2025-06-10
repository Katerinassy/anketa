document.addEventListener('DOMContentLoaded', function() {
    // Элементы формы
    const form = document.getElementById('internForm');
    const photoUpload = document.getElementById('photoUpload');
    const photoPreview = document.getElementById('photoPreview');
    const savePdfBtn = document.getElementById('savePdf');

    // Обработка загрузки фото
    photoUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                alert('Фото должно быть меньше 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                photoPreview.src = event.target.result;
                photoPreview.style.display = 'block';
                document.querySelector('.photo-placeholder label').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // Обработка отправки формы
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Показываем индикатор загрузки
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Отправка...';
        submitBtn.disabled = true;

        try {
            // Сбор данных формы
            const formData = new FormData();
            const formElements = e.target.elements;
            
            // Добавляем файл фото
            if (photoUpload.files.length > 0) {
                formData.append('photo', photoUpload.files[0]);
            }
            
            // Добавляем остальные данные
            for (let element of formElements) {
                if (element.name && element.type !== 'file') {
                    if (element.type === 'checkbox' || element.type === 'radio') {
                        if (element.checked) {
                            formData.append(element.name, element.value);
                        }
                    } else if (element.type !== 'button' && element.type !== 'submit') {
                        formData.append(element.name || element.id, element.value);
                    }
                }
            }
            
            // Отправка данных на сервер
            const response = await fetch('/api/application', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert('Анкета успешно отправлена! ID: ' + result.studentId);
                form.reset();
                photoPreview.style.display = 'none';
                document.querySelector('.photo-placeholder label').style.display = 'block';
            } else {
                throw new Error(result.error || 'Ошибка при отправке анкеты');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert(error.message || 'Произошла ошибка при отправке анкеты');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Генерация PDF
    savePdfBtn.addEventListener('click', function() {
        // В реальной реализации здесь будет код для генерации PDF
        alert('Для реализации сохранения в PDF подключите библиотеку jsPDF');
    });

    // Валидация даты рождения (вычисление возраста)
    const birthDateInput = document.getElementById('birthDate');
    const ageInput = document.getElementById('age');
    
    if (birthDateInput && ageInput) {
        birthDateInput.addEventListener('change', function() {
            const birthDate = new Date(this.value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            ageInput.value = age >= 0 ? age : '';
        });
    }
});