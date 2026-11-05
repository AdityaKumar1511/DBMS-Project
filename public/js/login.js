document.addEventListener('DOMContentLoaded', async () => {
    if (new URLSearchParams(window.location.search).get('expired')) {
        showToast('Session expired', 'Sign in again to continue.', 'info');
    }

    try {
        const auth = await apiFetch('/api/auth/status');
        if (auth && auth.authenticated) {
            window.location.href = '/dashboard.html';
            return;
        }
    } catch (err) {
        // The login page can still render if the status check fails.
    }

    const form = document.getElementById('login-form');
    const submitButton = document.getElementById('btn-submit');
    const buttonText = document.getElementById('btn-text');

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            showToast('Missing details', 'Enter both username and password.', 'error');
            return;
        }

        submitButton.disabled = true;
        buttonText.textContent = 'Signing in…';

        try {
            await apiFetch('/api/auth/login', {
                method: 'POST',
                body: { username, password }
            });
            window.location.href = '/dashboard.html';
        } catch (err) {
            showToast('Sign in failed', err.message || 'Invalid username or password.', 'error');
            submitButton.disabled = false;
            buttonText.textContent = 'Sign in';
        }
    });
});
