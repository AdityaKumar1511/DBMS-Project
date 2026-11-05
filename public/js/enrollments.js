let deleteEnrollmentId = null;
let enrollmentsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthStatus();
    if (!user) return;

    await loadDropdownOptions();
    loadEnrollments();

    document.getElementById('enroll-filter-course').addEventListener('change', loadEnrollments);
    document.getElementById('enroll-filter-semester').addEventListener('change', loadEnrollments);

    document.getElementById('btn-open-enroll').addEventListener('click', () => {
        document.getElementById('enroll-form').reset();
        document.getElementById('enroll-semester').value = '4';
        openModal('enroll-modal');
    });

    document.getElementById('enroll-form').addEventListener('submit', handleEnroll);
    document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);
});

async function loadDropdownOptions() {
    try {
        const [studentsRes, coursesRes] = await Promise.all([
            apiFetch('/api/students?limit=100'),
            apiFetch('/api/courses')
        ]);

        const studentSelect = document.getElementById('enroll-student-select');
        const courseSelect = document.getElementById('enroll-course-select');
        const filterCourse = document.getElementById('enroll-filter-course');

        studentSelect.innerHTML = '<option value="">Select student</option>';
        courseSelect.innerHTML = '<option value="">Select course</option>';
        filterCourse.innerHTML = '<option value="">All courses</option>';

        studentsRes.data.forEach(s => {
            studentSelect.innerHTML += `<option value="${s.student_id}">${escapeHtml(s.name)} (${escapeHtml(s.dept_name)})</option>`;
        });

        coursesRes.data.forEach(c => {
            courseSelect.innerHTML += `<option value="${c.course_id}">${escapeHtml(c.course_name)} (${c.credits} credits)</option>`;
            filterCourse.innerHTML += `<option value="${c.course_id}">${escapeHtml(c.course_name)}</option>`;
        });
    } catch (err) {
        showToast('Could not load form options', err.message, 'error');
    }
}

async function loadEnrollments() {
    const tbody = document.getElementById('enrollments-tbody');
    tbody.innerHTML = `<tr><td colspan="8" class="loading-row">Loading…</td></tr>`;

    const params = new URLSearchParams();
    const courseId = document.getElementById('enroll-filter-course').value;
    const semester = document.getElementById('enroll-filter-semester').value;
    if (courseId) params.append('course_id', courseId);
    if (semester) params.append('semester', semester);

    try {
        const res = await apiFetch(`/api/enrollments?${params.toString()}`);
        enrollmentsCache = res.data;

        if (enrollmentsCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <h3>No enrollments found</h3>
                            <p>Enroll a student or change the filters.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = enrollmentsCache.map(e => `
            <tr>
                <td class="mono cell-muted">${e.enrollment_id}</td>
                <td>
                    <div class="cell-primary">${escapeHtml(e.student_name)}</div>
                    <div class="cell-sub">${escapeHtml(e.dept_name)}</div>
                </td>
                <td>
                    <div>${escapeHtml(e.course_name)}</div>
                    <div class="cell-sub">${e.credits} credits</div>
                </td>
                <td class="mono">${e.semester}</td>
                <td class="cell-muted">${escapeHtml(e.instructor_name || 'Unassigned')}</td>
                <td class="mono cell-muted">${e.enrollment_date}</td>
                <td><span class="${gradeClass(e.grade)}">${escapeHtml(e.grade || '—')}</span></td>
                <td class="cell-right">
                    <div class="table-actions">
                        <button class="table-action danger" onclick="promptUnenroll(${e.enrollment_id})">Unenroll</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Could not load enrollments', err.message, 'error');
        tbody.innerHTML = `<tr><td colspan="8" class="loading-row">Failed to load enrollments.</td></tr>`;
    }
}

async function handleEnroll(event) {
    event.preventDefault();

    const body = {
        student_id: document.getElementById('enroll-student-select').value,
        course_id: document.getElementById('enroll-course-select').value,
        semester: document.getElementById('enroll-semester').value
    };

    const button = document.getElementById('btn-submit-enroll');
    button.disabled = true;
    button.textContent = 'Enrolling…';

    try {
        await apiFetch('/api/enrollments', { method: 'POST', body });
        showToast('Enrolled', 'Student enrolled and marks record created.', 'success');
        closeModal('enroll-modal');
        loadEnrollments();
    } catch (err) {
        showToast('Could not enroll student', err.message, 'error', 5500);
    } finally {
        button.disabled = false;
        button.textContent = 'Enroll';
    }
}

function promptUnenroll(enrollmentId) {
    const enrollment = enrollmentsCache.find(e => e.enrollment_id === enrollmentId);
    deleteEnrollmentId = enrollmentId;

    document.getElementById('delete-prompt-text').textContent = enrollment
        ? `Unenroll ${enrollment.student_name} from ${enrollment.course_name}? The marks record will also be removed.`
        : 'Cancel this enrollment?';

    openModal('delete-modal');
}

async function handleConfirmDelete() {
    if (!deleteEnrollmentId) return;

    try {
        await apiFetch(`/api/enrollments/${deleteEnrollmentId}`, { method: 'DELETE' });
        showToast('Unenrolled', 'Enrollment cancelled.', 'success');
        closeModal('delete-modal');
        deleteEnrollmentId = null;
        loadEnrollments();
    } catch (err) {
        showToast('Could not cancel enrollment', err.message, 'error');
        closeModal('delete-modal');
    }
}
