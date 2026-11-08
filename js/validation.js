// Модуль валидации форм с визуальной индикацией ошибок

let validationStylesInjected = false;

function injectValidationStyles() {
    if (validationStylesInjected) return;
    validationStylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
        .input-error {
            border-color: #ff0055 !important;
            box-shadow: 0 0 12px rgba(255, 0, 85, 0.25) !important;
        }

        .field-error-msg {
            color: #ff0055;
            font-size: 0.8rem;
            margin-top: 5px;
            text-align: left;
            display: flex;
            align-items: center;
            gap: 5px;
            animation: fadeInError 0.25s ease;
        }

        @keyframes fadeInError {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

export function validateRequired(value, fieldName = 'Поле') {
    if (!value || String(value).trim() === '') {
        return `${fieldName} обязательно для заполнения`;
    }
    return null;
}

export function validateEmail(value) {
    if (!value || String(value).trim() === '') {
        return 'Введите адрес электронной почты';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(String(value).trim())) {
        return 'Введите корректный Email (например, name@mail.com)';
    }
    return null;
}

export function validatePhone(value) {
    if (!value || String(value).trim() === '') {
        return 'Введите номер телефона';
    }
    const cleaned = String(value).replace(/[\s\-()]/g, '');
    // Поддержка +996XXXXXXXXX, 0XXXXXXXXX или международного формата от 9 до 15 цифр
    const phoneRegex = /^(\+?996\d{9}|0\d{9}|\+?\d{9,15})$/;
    if (!phoneRegex.test(cleaned)) {
        return 'Введите корректный номер телефона (например, +996 555 12-34-56)';
    }
    return null;
}

export function validateMinLength(value, min, fieldName = 'Поле') {
    if (!value || String(value).trim().length < min) {
        return `${fieldName} должно содержать минимум ${min} символов`;
    }
    return null;
}

export function validatePositiveNumber(value, fieldName = 'Значение') {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
        return `${fieldName} должно быть положительным числом`;
    }
    return null;
}

export function showFieldError(input, message) {
    if (!input) return;
    injectValidationStyles();

    // Удаляем старую ошибку, если была
    clearSingleFieldError(input);

    input.classList.add('input-error');

    const errorEl = document.createElement('div');
    errorEl.className = 'field-error-msg';
    errorEl.innerHTML = `<span>⚠️</span> <span>${message}</span>`;

    input.insertAdjacentElement('afterend', errorEl);

    const clearHandler = () => {
        clearSingleFieldError(input);
        input.removeEventListener('input', clearHandler);
        input.removeEventListener('focus', clearHandler);
    };

    input.addEventListener('input', clearHandler);
    input.addEventListener('focus', clearHandler);
}

export function clearSingleFieldError(input) {
    if (!input) return;
    input.classList.remove('input-error');
    const nextEl = input.nextElementSibling;
    if (nextEl && nextEl.classList.contains('field-error-msg')) {
        nextEl.remove();
    }
}

export function clearFieldErrors(form) {
    if (!form) return;
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    form.querySelectorAll('.field-error-msg').forEach(el => el.remove());
}

export function validateForm(rules) {
    clearFieldErrors(document);
    let valid = true;
    const errors = [];

    for (const rule of rules) {
        const { input, validators } = rule;
        if (!input) continue;
        clearSingleFieldError(input);

        const value = input.value;
        for (const validator of validators) {
            const errorMsg = validator(value);
            if (errorMsg) {
                showFieldError(input, errorMsg);
                errors.push({ input, message: errorMsg });
                valid = false;
                break;
            }
        }
    }

    if (!valid && errors.length > 0 && errors[0].input) {
        errors[0].input.focus();
    }

    return { valid, errors };
}
