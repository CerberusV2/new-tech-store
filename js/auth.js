import { api } from './api.js';

const form = document.getElementById('auth-form');
const msg = document.getElementById('auth-msg');
const submitBtn = document.getElementById('submit-btn');
const title = document.querySelector('.auth-title');
const subtitle = document.getElementById('auth-subtitle');
const usernameContainer = document.getElementById('username-container');

let mode = 'login'; // 'login' or 'register'

window.toggleMode = (newMode) => {
    mode = newMode;
    document.getElementById('btn-login').classList.toggle('active', mode === 'login');
    document.getElementById('btn-register').classList.toggle('active', mode === 'register');

    if (mode === 'login') {
        title.innerText = 'С возвращением';
        subtitle.innerText = 'Войдите, чтобы получить доступ к аккаунту';
        submitBtn.innerText = 'Войти';
        usernameContainer.style.display = 'none';
        document.getElementById('username').required = false;
    } else {
        title.innerText = 'Создать аккаунт';
        subtitle.innerText = 'Зарегистрируйтесь, чтобы начать покупки';
        submitBtn.innerText = 'Зарегистрироваться';
        usernameContainer.style.display = 'block';
        document.getElementById('username').required = true;
    }
    msg.innerText = '';
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;

    msg.innerText = "Загрузка...";

    if (mode === 'login') {
        const { user, session, error } = await api.signIn(email, password);
        console.log("Login result:", user, session, error);

        if (error) {
            msg.innerText = "Ошибка входа: " + error.message;
            if (error.message.includes("Invalid login")) {
                msg.innerText = "Неверный логин или пароль.";
            } else if (error.message.includes("Email not confirmed")) {
                msg.innerText = "Подтвердите Email перед входом (проверьте папку Спам).";
            }
        } else if (!session) {
            msg.innerText = "Вход выполнен, но сессия не создана. Подтвердите Email.";
        } else {
            msg.innerText = "Успешный вход! Перенаправление...";
            window.location.href = 'index.html';
        }
    } else {
        const { user, error } = await api.signUp(email, password, username);
        if (error) {
            msg.innerText = "Ошибка регистрации: " + error.message;
            if (error.message.includes("rate limit")) {
                msg.innerText = "Слишком часто! Подождите пару минут или отключите 'Confirm Email' в Supabase.";
            }
        } else {
            if (user && !user.email_confirmed_at && user.identities?.length > 0) {
                msg.innerText = "Регистрация успешна! Подтвердите почту.";
            } else {
                msg.innerText = "Регистрация успешна! Теперь вы можете войти.";
            }
        }
    }
});
