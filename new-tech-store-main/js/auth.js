import { api } from './api.js';
import { showToast } from './toast.js';
import { validateForm, validateEmail, validateMinLength, validateRequired, clearFieldErrors } from './validation.js';

const form = document.getElementById('auth-form');
const msg = document.getElementById('auth-msg');
const submitBtn = document.getElementById('submit-btn');
const title = document.querySelector('.auth-title');
const subtitle = document.getElementById('auth-subtitle');
const usernameContainer = document.getElementById('username-container');

let mode = 'login';

window.toggleMode = (newMode) => {
    mode = newMode;
    clearFieldErrors(form);
    document.getElementById('btn-login').classList.toggle('active', mode === 'login');
    document.getElementById('btn-register').classList.toggle('active', mode === 'register');

    if (mode === 'login') {
        title.innerText = 'С возвращением';
        subtitle.innerText = 'Войдите, чтобы получить доступ к аккаунту';
        submitBtn.innerText = 'Войти';
        usernameContainer.style.display = 'none';
    } else {
        title.innerText = 'Создать аккаунт';
        subtitle.innerText = 'Зарегистрируйтесь, чтобы начать покупки';
        submitBtn.innerText = 'Зарегистрироваться';
        usernameContainer.style.display = 'block';
    }
    msg.innerText = '';
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');

    const rules = [];
    if (mode === 'register') {
        rules.push({
            input: usernameInput,
            validators: [
                (v) => validateRequired(v, 'Имя пользователя'),
                (v) => validateMinLength(v, 2, 'Имя пользователя')
            ]
        });
    }

    rules.push(
        {
            input: emailInput,
            validators: [(v) => validateEmail(v)]
        },
        {
            input: passwordInput,
            validators: [
                (v) => validateRequired(v, 'Пароль'),
                (v) => validateMinLength(v, 6, 'Пароль')
            ]
        }
    );

    const { valid } = validateForm(rules);
    if (!valid) {
        showToast('Пожалуйста, проверьте правильность ввода', 'error');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const username = usernameInput.value.trim();

    msg.innerText = "Загрузка...";
    submitBtn.disabled = true;

    if (mode === 'login') {
        const { user, session, error } = await api.signIn(email, password);

        if (error) {
            let errText = "Ошибка входа: " + error.message;
            if (error.message.includes("Invalid login")) {
                errText = "Неверный логин или пароль.";
            } else if (error.message.includes("Email not confirmed")) {
                errText = "Подтвердите Email перед входом (проверьте папку Спам).";
            }
            msg.innerText = errText;
            showToast(errText, 'error');
            submitBtn.disabled = false;
        } else if (!session) {
            msg.innerText = "Вход выполнен, но сессия не создана. Подтвердите Email.";
            showToast("Подтвердите Email перед входом", 'warning');
            submitBtn.disabled = false;
        } else {
            msg.innerText = "Успешный вход! Перенаправление...";
            showToast("С возвращением!", 'success');
            const role = await api.getUserRole();
            setTimeout(() => {
                window.location.href = role === 'admin' ? 'orders.html' : 'profile.html';
            }, 500);
        }
    } else {
        const { user, error } = await api.signUp(email, password, username);
        submitBtn.disabled = false;

        if (error) {
            let errText = "Ошибка регистрации: " + error.message;
            if (error.message.includes("rate limit")) {
                errText = "Слишком частые запросы! Подождите пару минут.";
            }
            msg.innerText = errText;
            showToast(errText, 'error');
        } else {
            if (user && !user.email_confirmed_at && user.identities?.length > 0) {
                msg.innerText = "Регистрация успешна! Подтвердите почту.";
                showToast("Регистрация успешна! Проверьте вашу почту", 'success');
            } else {
                msg.innerText = "Регистрация успешна! Теперь вы можете войти.";
                showToast("Аккаунт создан! Войдите в систему", 'success');
                window.toggleMode('login');
            }
        }
    }
});
