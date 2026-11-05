document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthStatus();
    if (!user) return;

    await loadStudentSelector();

    const select = document.getElementById('report-student-select');
    select.addEventListener('change', () => {
        if (!select.value) return;

        loadReportCard(select.value);

        const url = new URL(window.location);
        url.searchParams.set('student_id', select.value);
        window.history.replaceState({}, '', url);
    });

    const passedId = new URLSearchParams(window.location.search).get('student_id');
    if (passedId) {
        select.value = passedId;
        loadReportCard(passedId);
    } else if (select.options.length > 1) {
        select.selectedIndex = 1;
        loadReportCard(select.value);
    }
});

async function loadStudentSelector() {
    try {
        const res = await apiFetch('/api/students?limit=100');
        const select = document.getElementById('report-student-select');
        select.innerHTML = '<option value="">Select student</option>';

        res.data.forEach(s => {
            select.innerHTML += `<option value="${s.student_id}">${escapeHtml(s.name)} (${escapeHtml(s.dept_name)})</option>`;
        });
    } catch (err) {
        showToast('Could not load students', err.message, 'error');
    }
}

async function loadReportCard(studentId) {
    const tbody = document.getElementById('report-courses-tbody');
    tbody.innerHTML = `<tr><td colspan="9" class="report-empty">Loading…</td></tr>`;

    try {
        const res = await apiFetch(`/api/reports/report-card/${studentId}`);
        const data = res.data;

        document.getElementById('rep-id').textContent = data.student.student_id;
        document.getElementById('rep-name').textContent = data.student.student_name || data.student.name;
        document.getElementById('rep-dept').textContent = data.student.dept_name;
        document.getElementById('rep-year').textContent = data.student.admission_year;
        document.getElementById('rep-email').textContent = data.student.student_email || data.student.email;
        document.getElementById('rep-phone').textContent = data.student.student_phone || data.student.phone || '—';

        if (!data.courses || data.courses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="report-empty">No course enrollments found.</td></tr>`;
        } else {
            tbody.innerHTML = data.courses.map(c => `
                <tr>
                    <td class="mono">${c.semester}</td>
                    <td>${escapeHtml(c.course_name)}</td>
                    <td class="mono">${c.credits}</td>
                    <td class="cell-muted">${escapeHtml(c.instructor_name)}</td>
                    <td class="mono">${Number(c.internal_marks).toFixed(2)}</td>
                    <td class="mono">${Number(c.external_marks).toFixed(2)}</td>
                    <td class="mono">${Number(c.total_marks).toFixed(2)}</td>
                    <td><span class="${gradeClass(c.grade)}">${escapeHtml(c.grade)}</span></td>
                    <td class="mono">${Number(c.grade_point).toFixed(1)}</td>
                </tr>
            `).join('');
        }

        document.getElementById('rep-credits').textContent = data.summary.totalCredits;
        document.getElementById('rep-avg').textContent = `${data.summary.averageMarks}%`;
        document.getElementById('rep-cgpa').textContent = `${data.summary.cgpa} / 10`;
        document.getElementById('rep-standing').textContent = data.summary.standing;
    } catch (err) {
        showToast('Could not build report card', err.message, 'error');
        tbody.innerHTML = `<tr><td colspan="9" class="report-empty">${escapeHtml(err.message)}</td></tr>`;
    }
}
