let deleteDeptId = null;
let departmentsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthStatus();
    if (!user) return;

    loadDepartments();

    document.getElementById('btn-add-dept').addEventListener('click', () => {
        document.getElementById('dept-form').reset();
        document.getElementById('dept-id').value = '';
        document.getElementById('dept-modal-title').textContent = 'Add department';
        openModal('dept-modal');
    });

    document.getElementById('dept-form').addEventListener('submit', handleSaveDept);
    document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);
});

async function loadDepartments() {
    const tbody = document.getElementById('depts-tbody');
    tbody.innerHTML = `<tr><td colspan="7" class="loading-row">Loading…</td></tr>`;

    try {
        const res = await apiFetch('/api/departments');
        departmentsCache = res.data;

        if (departmentsCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <h3>No departments found</h3>
                            <p>Add the first department to get started.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = departmentsCache.map(d => `
            <tr>
                <td class="mono cell-muted">${d.dept_id}</td>
                <td class="cell-primary">${escapeHtml(d.dept_name)}</td>
                <td class="cell-muted">${escapeHtml(d.hod)}</td>
                <td class="mono">${d.student_count}</td>
                <td class="mono">${d.course_count}</td>
                <td class="mono">${d.faculty_count}</td>
                <td class="cell-right">
                    <div class="table-actions">
                        <button class="table-action" onclick="openEditDept(${d.dept_id})">Edit</button>
                        <button class="table-action danger" onclick="promptDeleteDept(${d.dept_id})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Could not load departments', err.message, 'error');
        tbody.innerHTML = `<tr><td colspan="7" class="loading-row">Failed to load departments.</td></tr>`;
    }
}

function openEditDept(deptId) {
    const dept = departmentsCache.find(d => d.dept_id === deptId);
    if (!dept) return;

    document.getElementById('dept-id').value = dept.dept_id;
    document.getElementById('dept-name').value = dept.dept_name;
    document.getElementById('dept-hod').value = dept.hod;
    document.getElementById('dept-modal-title').textContent = `Edit department ${dept.dept_id}`;
    openModal('dept-modal');
}

async function handleSaveDept(event) {
    event.preventDefault();

    const deptId = document.getElementById('dept-id').value;
    const body = {
        dept_name: document.getElementById('dept-name').value.trim(),
        hod: document.getElementById('dept-hod').value.trim()
    };

    const isEdit = Boolean(deptId);
    const button = document.getElementById('btn-save-dept');
    button.disabled = true;

    try {
        await apiFetch(isEdit ? `/api/departments/${deptId}` : '/api/departments', {
            method: isEdit ? 'PUT' : 'POST',
            body
        });
        showToast('Saved', `Department ${isEdit ? 'updated' : 'added'}.`, 'success');
        closeModal('dept-modal');
        loadDepartments();
    } catch (err) {
        showToast('Could not save department', err.message, 'error');
    } finally {
        button.disabled = false;
    }
}

function promptDeleteDept(deptId) {
    const dept = departmentsCache.find(d => d.dept_id === deptId);
    deleteDeptId = deptId;

    document.getElementById('delete-prompt-text').textContent =
        `Delete ${dept ? dept.dept_name : 'this department'}? Departments with linked records cannot be deleted.`;

    openModal('delete-modal');
}

async function handleConfirmDelete() {
    if (!deleteDeptId) return;

    try {
        await apiFetch(`/api/departments/${deleteDeptId}`, { method: 'DELETE' });
        showToast('Deleted', 'Department removed.', 'success');
        closeModal('delete-modal');
        deleteDeptId = null;
        loadDepartments();
    } catch (err) {
        showToast('Could not delete department', err.message, 'error');
        closeModal('delete-modal');
    }
}
