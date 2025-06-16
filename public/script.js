document.addEventListener('DOMContentLoaded', function () {

    const form = document.getElementById('internForm');
    const photoUpload = document.getElementById('photoUpload');
    const photoPreview = document.getElementById('photoPreview');
    const savePdfBtn = document.getElementById('savePdf');


    photoUpload.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('Фото должно быть меньше 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (event) {
                photoPreview.src = event.target.result;
                photoPreview.style.display = 'block';
                document.querySelector('.photo-placeholder label').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });


    form.addEventListener('submit', async function (e) {
        e.preventDefault();


        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Отправка...';
        submitBtn.disabled = true;

        try {

            const formData = new FormData();
            const formElements = e.target.elements;

            if (photoUpload.files.length > 0) {
                formData.append('photo', photoUpload.files[0]);
            }


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


    savePdfBtn.addEventListener('click', function () {

        alert('Для реализации сохранения в PDF подключите библиотеку jsPDF');
    });


    const birthDateInput = document.getElementById('birthDate');
    const ageInput = document.getElementById('age');

    if (birthDateInput && ageInput) {
        birthDateInput.addEventListener('change', function () {
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