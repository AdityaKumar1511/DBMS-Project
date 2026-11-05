let currentPage = 1;
const limit = 10;
let deleteTargetId = null;
let studentsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthStatus();
    if (!user) return;

    await loadDepartments();
    loadStudents();

    let searchTimeout;
    document.getElementById('filter-search').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadStudents();
        }, 300);
    });

    document.getElementById('filter-dept').addEventListener('change', () => {
        currentPage = 1;
        loadStudents();
    });

    document.getElementById('filter-year').addEventListener('change', () => {
        currentPage = 1;
        loadStudents();
    });

    document.getElementById('btn-reset-filters').addEventListener('click', () => {
        document.getElementById('filter-search').value = '';
        document.getElementById('filter-dept').value = '';
        document.getElementById('filter-year').value = '';
        currentPage = 1;
        loadStudents();
    });

    document.getElementById('btn-add-student').addEventListener('click', () => {
        document.getElementById('student-form').reset();
        document.getElementById('student-id').value = '';
        document.getElementById('modal-title').textContent = 'Add student';
        openModal('student-modal');
    });

    document.getElementById('student-form').addEventListener('submit', handleSaveStudent);
    document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);
});

async function loadDepartments() {
    try {
        const res = await apiFetch('/api/departments');
        const departments = res.data;

        const filterSelect = document.getElementById('filter-dept');
        const modalSelect = document.getElementById('student-dept');

        filterSelect.innerHTML = '<option value="">All departments</option>';
        modalSelect.innerHTML = '<option value="">Select department</option>';

        departments.forEach(d => {
            const option = `<option value="${d.dept_id}">${escapeHtml(d.dept_name)}</option>`;
            filterSelect.innerHTML += option;
            modalSelect.innerHTML += option;
        });
    } catch (err) {
        showToast('Could not load departments', err.message, 'error');
    }
}

async function loadStudents() {
    const tbody = document.getElementById('students-tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="loading-row">Loading…</td></tr>`;

    const params = new URLSearchParams({ page: currentPage, limit });

    const search = document.getElementById('filter-search').value.trim();
    const deptId = document.getElementById('filter-dept').value;
    const admissionYear = document.getElementById('filter-year').value;

    if (search) params.append('search', search);
    if (deptId) params.append('dept_id', deptId);
    if (admissionYear) params.append('admission_year', admissionYear);

    try {
        const res = await apiFetch(`/api/students?${params.toString()}`);
        const pagination = res.pagination;

        studentsCache = res.data;

        document.getElementById('students-count-badge').textContent =
            `${pagination.total} ${pagination.total === 1 ? 'student' : 'students'}`;

        const first = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
        const last = Math.min(pagination.page * pagination.limit, pagination.total);
        document.getElementById('pagination-info').textContent =
            `Showing ${first}–${last} of ${pagination.total}`;

        renderStudentsTable(res.data);
        renderPagination(pagination);
    } catch (err) {
        showToast('Could not load students', err.message, 'error');
        tbody.innerHTML = `<tr><td colspan="6" class="loading-row">Failed to load students.</td></tr>`;
    }
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('students-tbody');

    if (!students || students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <h3>No students found</h3>
                        <p>Adjust the search or clear the filters.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = students.map(s => `
        <tr>
            <td class="mono cell-muted">${s.student_id}</td>
            <td>
                <div class="cell-primary">${escapeHtml(s.name)}</div>
                <div class="cell-sub">${escapeHtml(s.email)}</div>
            </td>
            <td>${escapeHtml(s.dept_name)}</td>
            <td class="cell-muted">${escapeHtml(s.phone || '—')}</td>
            <td class="mono">${s.admission_year}</td>
            <td class="cell-right">
                <div class="table-actions">
                    <a class="table-action" href="report-card.html?student_id=${s.student_id}">Report</a>
                    <button class="table-action" onclick="openEditStudent(${s.student_id})">Edit</button>
                    <button class="table-action danger" onclick="promptDeleteStudent(${s.student_id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderPagination(pagination) {
    const controls = document.getElementById('pagination-controls');
    controls.innerHTML = '';

    if (pagination.totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.textContent = 'Previous';
    prev.disabled = pagination.page === 1;
    prev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadStudents();
        }
    });
    controls.appendChild(prev);

    for (let i = 1; i <= pagination.totalPages; i++) {
        const button = document.createElement('button');
        button.className = `page-btn${i === pagination.page ? ' active' : ''}`;
        button.textContent = i;
        button.addEventListener('click', () => {
            currentPage = i;
            loadStudents();
        });
        controls.appendChild(button);
    }

    const next = document.createElement('button');
    next.className = 'page-btn';
    next.textContent = 'Next';
    next.disabled = pagination.page === pagination.totalPages;
    next.addEventListener('click', () => {
        if (currentPage < pagination.totalPages) {
            currentPage++;
            loadStudents();
        }
    });
    controls.appendChild(next);
}

async function openEditStudent(studentId) {
    try {
        const res = await apiFetch(`/api/students/${studentId}`);
        const s = res.data;

        document.getElementById('student-id').value = s.student_id;
        document.getElementById('student-name').value = s.name;
        document.getElementById('student-email').value = s.email;
        document.getElementById('student-phone').value = s.phone || '';
        document.getElementById('student-dept').value = s.dept_id;
        document.getElementById('student-dob').value = s.dob ? s.dob.split('T')[0] : '';
        document.getElementById('student-gender').value = s.gender;
        document.getElementById('student-year').value = s.admission_year;
        document.getElementById('student-address').value = s.address || '';

        document.getElementById('modal-title').textContent = `Edit student ${s.student_id}`;
        openModal('student-modal');
    } catch (err) {
        showToast('Could not load student', err.message, 'error');
    }
}

async function handleSaveStudent(event) {
    event.preventDefault();

    const studentId = document.getElementById('student-id').value;
    const body = {
        name: document.getElementById('student-name').value.trim(),
        email: document.getElementById('student-email').value.trim(),
        phone: document.getElementById('student-phone').value.trim(),
        dept_id: document.getElementById('student-dept').value,
        dob: document.getElementById('student-dob').value,
        gender: document.getElementById('student-gender').value,
        admission_year: document.getElementById('student-year').value,
        address: document.getElementById('student-address').value.trim()
    };

    const isEdit = Boolean(studentId);
    const button = document.getElementById('btn-save-student');
    button.disabled = true;

    try {
        await apiFetch(isEdit ? `/api/students/${studentId}` : '/api/students', {
            method: isEdit ? 'PUT' : 'POST',
            body
        });
        showToast('Saved', `Student ${isEdit ? 'updated' : 'added'}.`, 'success');
        closeModal('student-modal');
        loadStudents();
    } catch (err) {
        showToast('Could not save student', err.message, 'error');
    } finally {
        button.disabled = false;
    }
}

function promptDeleteStudent(studentId) {
    const student = studentsCache.find(s => s.student_id === studentId);
    deleteTargetId = studentId;

    document.getElementById('delete-prompt-text').textContent =
        `Delete ${student ? student.name : 'this student'}? Enrollments, marks, and attendance will also be removed.`;

    openModal('delete-modal');
}

async function handleConfirmDelete() {
    if (!deleteTargetId) return;

    try {
        await apiFetch(`/api/students/${deleteTargetId}`, { method: 'DELETE' });
        showToast('Deleted', 'Student removed.', 'success');
        closeModal('delete-modal');
        deleteTargetId = null;
        loadStudents();
    } catch (err) {
        showToast('Could not delete student', err.message, 'error');
    }
}
