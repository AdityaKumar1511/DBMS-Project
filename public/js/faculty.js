let deleteFacultyId = null;
let facultyCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthStatus();
    if (!user) return;

    await loadDepartmentDropdown();
    loadFaculty();

    document.getElementById('faculty-filter-dept').addEventListener('change', loadFaculty);

    document.getElementById('btn-add-faculty').addEventListener('click', () => {
        document.getElementById('faculty-form').reset();
        document.getElementById('faculty-id').value = '';
        document.getElementById('faculty-modal-title').textContent = 'Add faculty';
        openModal('faculty-modal');
    });

    document.getElementById('faculty-form').addEventListener('submit', handleSaveFaculty);
    document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);
});

async function loadDepartmentDropdown() {
    try {
        const res = await apiFetch('/api/departments');
        const filterSelect = document.getElementById('faculty-filter-dept');
        const modalSelect = document.getElementById('faculty-dept');

        filterSelect.innerHTML = '<option value="">All departments</option>';
        modalSelect.innerHTML = '<option value="">Select department</option>';

        res.data.forEach(d => {
            const option = `<option value="${d.dept_id}">${escapeHtml(d.dept_name)}</option>`;
            filterSelect.innerHTML += option;
            modalSelect.innerHTML += option;
        });
    } catch (err) {
        showToast('Could not load departments', err.message, 'error');
    }
}

async function loadFaculty() {
    const tbody = document.getElementById('faculty-tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="loading-row">Loading…</td></tr>`;

    const deptId = document.getElementById('faculty-filter-dept').value;

    try {
        const res = await apiFetch(deptId ? `/api/faculty?dept_id=${deptId}` : '/api/faculty');
        facultyCache = res.data;

        if (facultyCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <h3>No faculty found</h3>
                            <p>Add a faculty member or choose another department.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = facultyCache.map(f => `
            <tr>
                <td class="mono cell-muted">${f.faculty_id}</td>
                <td class="cell-primary">${escapeHtml(f.name)}</td>
                <td class="cell-muted">${escapeHtml(f.email)}</td>
                <td>${escapeHtml(f.dept_name)}</td>
                <td class="mono">${f.assigned_courses_count}</td>
                <td class="cell-right">
                    <div class="table-actions">
                        <button class="table-action" onclick="openEditFaculty(${f.faculty_id})">Edit</button>
                        <button class="table-action danger" onclick="promptDeleteFaculty(${f.faculty_id})">Remove</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Could not load faculty', err.message, 'error');
        tbody.innerHTML = `<tr><td colspan="6" class="loading-row">Failed to load faculty.</td></tr>`;
    }
}

function openEditFaculty(facultyId) {
    const faculty = facultyCache.find(f => f.faculty_id === facultyId);
    if (!faculty) return;

    document.getElementById('faculty-id').value = faculty.faculty_id;
    document.getElementById('faculty-name').value = faculty.name;
    document.getElementById('faculty-email').value = faculty.email;
    document.getElementById('faculty-dept').value = faculty.dept_id;
    document.getElementById('faculty-modal-title').textContent = `Edit faculty ${faculty.faculty_id}`;
    openModal('faculty-modal');
}

async function handleSaveFaculty(event) {
    event.preventDefault();

    const facultyId = document.getElementById('faculty-id').value;
    const body = {
        name: document.getElementById('faculty-name').value.trim(),
        email: document.getElementById('faculty-email').value.trim(),
        dept_id: document.getElementById('faculty-dept').value
    };

    const isEdit = Boolean(facultyId);
    const button = document.getElementById('btn-save-faculty');
    button.disabled = true;

    try {
        await apiFetch(isEdit ? `/api/faculty/${facultyId}` : '/api/faculty', {
            method: isEdit ? 'PUT' : 'POST',
            body
        });
        showToast('Saved', `Faculty member ${isEdit ? 'updated' : 'added'}.`, 'success');
        closeModal('faculty-modal');
        loadFaculty();
    } catch (err) {
        showToast('Could not save faculty', err.message, 'error');
    } finally {
        button.disabled = false;
    }
}

function promptDeleteFaculty(facultyId) {
    const faculty = facultyCache.find(f => f.faculty_id === facultyId);
    deleteFacultyId = facultyId;

    document.getElementById('delete-prompt-text').textContent =
        `Remove ${faculty ? faculty.name : 'this faculty member'}? Assigned courses will become unassigned.`;

    openModal('delete-modal');
}

async function handleConfirmDelete() {
    if (!deleteFacultyId) return;

    try {
        await apiFetch(`/api/faculty/${deleteFacultyId}`, { method: 'DELETE' });
        showToast('Removed', 'Faculty member removed.', 'success');
        closeModal('delete-modal');
        deleteFacultyId = null;
        loadFaculty();
    } catch (err) {
        showToast('Could not remove faculty', err.message, 'error');
        closeModal('delete-modal');
    }
}
