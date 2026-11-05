async function apiFetch(endpoint, options = {}) {
    const headers = { Accept: 'application/json' };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }

    const response = await fetch(endpoint, {
        ...options,
        headers: { ...headers, ...options.headers }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && !window.location.pathname.endsWith('login.html')) {
        window.location.href = '/login.html?expired=1';
        return;
    }

    if (!response.ok) {
        const err = new Error(data.message || `Request failed with status ${response.status}`);
        err.status = response.status;
        err.data = data;
        throw err;
    }

    return data;
}

function showToast(title, message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    const removeToast = () => toast.remove();
    toast.addEventListener('click', removeToast);
    setTimeout(removeToast, duration);
}

async function checkAuthStatus() {
    try {
        const res = await apiFetch('/api/auth/status');
        if (!res.authenticated) {
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = '/login.html';
            }
            return null;
        }

        if (window.location.pathname.endsWith('login.html')) {
            window.location.href = '/dashboard.html';
            return res.user;
        }

        const nameEl = document.getElementById('sidebar-user-name');
        const roleEl = document.getElementById('sidebar-user-role');
        if (nameEl) nameEl.textContent = res.user.username;
        if (roleEl) roleEl.textContent = res.user.role;

        return res.user;
    } catch (err) {
        console.error('Auth verification error:', err);
        return null;
    }
}

async function handleLogout() {
    try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (err) {
        showToast('Logout failed', err.message, 'error');
    }
}

function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>'"]/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[char] || char));
}

function gradeClass(grade) {
    return grade === 'F' ? 'grade grade-fail' : 'grade';
}

document.addEventListener('DOMContentLoaded', () => {
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    const sidebar = document.querySelector('.app-sidebar');
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeModal(overlay.id);
        });
    });
});
