let marksCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthStatus();
    if (!user) return;

    await loadCourseDropdown();
    loadMarks();

    document.getElementById('marks-filter-course').addEventListener('change', loadMarks);
    document.getElementById('marks-filter-semester').addEventListener('change', loadMarks);
    document.getElementById('marks-filter-grade').addEventListener('change', loadMarks);

    document.getElementById('marks-internal').addEventListener('input', updatePreview);
    document.getElementById('marks-external').addEventListener('input', updatePreview);
    document.getElementById('marks-form').addEventListener('submit', handleSaveMarks);
});

async function loadCourseDropdown() {
    try {
        const res = await apiFetch('/api/courses');
        const select = document.getElementById('marks-filter-course');
        select.innerHTML = '<option value="">All courses</option>';
        res.data.forEach(c => {
            select.innerHTML += `<option value="${c.course_id}">${escapeHtml(c.course_name)}</option>`;
        });
    } catch (err) {
        showToast('Could not load courses', err.message, 'error');
    }
}

async function loadMarks() {
    const tbody = document.getElementById('marks-tbody');
    tbody.innerHTML = `<tr><td colspan="9" class="loading-row">Loading…</td></tr>`;

    const params = new URLSearchParams();
    const courseId = document.getElementById('marks-filter-course').value;
    const semester = document.getElementById('marks-filter-semester').value;
    const grade = document.getElementById('marks-filter-grade').value;
    if (courseId) params.append('course_id', courseId);
    if (semester) params.append('semester', semester);
    if (grade) params.append('grade', grade);

    try {
        const res = await apiFetch(`/api/marks?${params.toString()}`);
        marksCache = res.data;

        if (marksCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <h3>No marks found</h3>
                            <p>Change the filters or enroll a student first.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = marksCache.map(m => `
            <tr>
                <td class="mono cell-muted">${m.enrollment_id}</td>
                <td>
                    <div class="cell-primary">${escapeHtml(m.student_name)}</div>
                    <div class="cell-sub">${escapeHtml(m.dept_name)}</div>
                </td>
                <td>${escapeHtml(m.course_name)}</td>
                <td class="mono">${m.semester}</td>
                <td class="mono cell-muted">${Number(m.internal).toFixed(2)}</td>
                <td class="mono cell-muted">${Number(m.external).toFixed(2)}</td>
                <td class="mono">${Number(m.total).toFixed(2)}</td>
                <td><span class="${gradeClass(m.grade)}">${escapeHtml(m.grade || '—')}</span></td>
                <td class="cell-right">
                    <div class="table-actions">
                        <button class="table-action" onclick="openEditMarks(${m.enrollment_id})">Edit</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Could not load marks', err.message, 'error');
        tbody.innerHTML = `<tr><td colspan="9" class="loading-row">Failed to load marks.</td></tr>`;
    }
}

function openEditMarks(enrollmentId) {
    const marks = marksCache.find(m => m.enrollment_id === enrollmentId);
    if (!marks) return;

    document.getElementById('marks-enrollment-id').value = marks.enrollment_id;
    document.getElementById('modal-student-desc').textContent = marks.student_name;
    document.getElementById('modal-course-desc').textContent = `${marks.course_name} · Semester ${marks.semester}`;
    document.getElementById('marks-internal').value = marks.internal;
    document.getElementById('marks-external').value = marks.external;

    updatePreview();
    openModal('marks-modal');
}

function updatePreview() {
    const internal = parseFloat(document.getElementById('marks-internal').value) || 0;
    const external = parseFloat(document.getElementById('marks-external').value) || 0;
    const total = internal + external;

    let grade = 'F';
    if (total >= 90) grade = 'O';
    else if (total >= 80) grade = 'A+';
    else if (total >= 70) grade = 'A';
    else if (total >= 60) grade = 'B';
    else if (total >= 50) grade = 'C';
    else if (total >= 40) grade = 'P';

    const previewGrade = document.getElementById('preview-grade');
    document.getElementById('preview-total').textContent = total.toFixed(2);
    previewGrade.textContent = grade;
    previewGrade.className = gradeClass(grade);
}

async function handleSaveMarks(event) {
    event.preventDefault();

    const body = {
        enrollment_id: document.getElementById('marks-enrollment-id').value,
        internal: parseFloat(document.getElementById('marks-internal').value),
        external: parseFloat(document.getElementById('marks-external').value)
    };

    const button = document.getElementById('btn-save-marks');
    button.disabled = true;

    try {
        const res = await apiFetch('/api/marks', { method: 'POST', body });
        showToast('Saved', `Total ${res.data.total}, grade ${res.data.grade}.`, 'success');
        closeModal('marks-modal');
        loadMarks();
    } catch (err) {
        showToast('Could not save marks', err.message, 'error');
    } finally {
        button.disabled = false;
    }
}
