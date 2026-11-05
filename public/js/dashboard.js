document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthStatus();
    if (!user) return;

    loadDashboard();
});

async function loadDashboard() {
    try {
        const res = await apiFetch('/api/dashboard');
        const data = res.data;

        document.getElementById('stat-students').textContent = data.counts.students;
        document.getElementById('stat-courses').textContent = data.counts.courses;
        document.getElementById('stat-departments').textContent = data.counts.departments;
        document.getElementById('stat-faculty').textContent = data.counts.faculty;
        document.getElementById('stat-average-marks').textContent = Number(data.counts.averageMarks).toFixed(2);
        document.getElementById('stat-defaulters').textContent = data.counts.defaultersCount;

        renderDepartmentSummary(data.departmentSummary);
        renderTopStudents(data.topStudents);
    } catch (err) {
        showToast('Could not load dashboard', err.message, 'error');
    }
}

function renderDepartmentSummary(rows) {
    const tbody = document.getElementById('dept-summary-tbody');

    if (!rows || rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="loading-row">No departments found.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(d => `
        <tr>
            <td>
                <div class="cell-primary">${escapeHtml(d.dept_name)}</div>
                <div class="cell-sub">${escapeHtml(d.hod)}</div>
            </td>
            <td class="mono">${d.total_students}</td>
            <td class="mono">${d.total_courses}</td>
            <td class="mono">${d.total_faculty}</td>
            <td class="mono">${Number(d.average_marks).toFixed(2)}</td>
        </tr>
    `).join('');
}

function renderTopStudents(students) {
    const tbody = document.getElementById('top-students-tbody');

    if (!students || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="loading-row">No marks recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = students.map((s, index) => `
        <tr>
            <td class="mono cell-muted">${index + 1}</td>
            <td>
                <a class="row-link" href="report-card.html?student_id=${s.student_id}">${escapeHtml(s.name)}</a>
                <div class="cell-sub">${escapeHtml(s.email)}</div>
            </td>
            <td class="cell-muted">${escapeHtml(s.dept_name)}</td>
            <td class="mono">${s.courses_enrolled}</td>
            <td class="mono">${Number(s.average_score).toFixed(2)}</td>
        </tr>
    `).join('');
}
