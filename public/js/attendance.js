let activeTab = 'logs';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthStatus();
    if (!user) return;

    document.getElementById('mark-date').value = new Date().toISOString().split('T')[0];

    await loadDropdowns();
    loadAttendance();

    document.getElementById('tab-all-logs').addEventListener('click', () => switchTab('logs'));
    document.getElementById('tab-defaulters').addEventListener('click', () => switchTab('defaulters'));

    document.getElementById('attendance-filter-course').addEventListener('change', loadAttendance);
    document.getElementById('attendance-filter-date').addEventListener('change', loadAttendance);
    document.getElementById('btn-reset-attendance-filter').addEventListener('click', () => {
        document.getElementById('attendance-filter-course').value = '';
        document.getElementById('attendance-filter-date').value = '';
        loadAttendance();
    });

    document.getElementById('btn-mark-attendance').addEventListener('click', () => openModal('mark-modal'));
    document.getElementById('mark-form').addEventListener('submit', handleSaveAttendance);

    document.getElementById('btn-check-percentage').addEventListener('click', () => {
        document.getElementById('proc-result-box').classList.add('hidden');
        openModal('proc-modal');
    });
    document.getElementById('btn-run-proc').addEventListener('click', handleRunProcedure);
});

async function loadDropdowns() {
    try {
        const [coursesRes, studentsRes] = await Promise.all([
            apiFetch('/api/courses'),
            apiFetch('/api/students?limit=100')
        ]);

        const filterCourse = document.getElementById('attendance-filter-course');
        const modalCourse = document.getElementById('mark-course-select');
        const procCourse = document.getElementById('proc-course');
        const modalStudent = document.getElementById('mark-student-select');
        const procStudent = document.getElementById('proc-student');

        filterCourse.innerHTML = '<option value="">All courses</option>';
        modalCourse.innerHTML = '<option value="">Select course</option>';
        procCourse.innerHTML = '';

        coursesRes.data.forEach(c => {
            const option = `<option value="${c.course_id}">${escapeHtml(c.course_name)}</option>`;
            filterCourse.innerHTML += option;
            modalCourse.innerHTML += option;
            procCourse.innerHTML += option;
        });

        modalStudent.innerHTML = '<option value="">Select student</option>';
        procStudent.innerHTML = '';

        studentsRes.data.forEach(s => {
            const option = `<option value="${s.student_id}">${escapeHtml(s.name)} (${s.student_id})</option>`;
            modalStudent.innerHTML += option;
            procStudent.innerHTML += option;
        });
    } catch (err) {
        showToast('Could not load form options', err.message, 'error');
    }
}

function switchTab(tab) {
    activeTab = tab;

    document.getElementById('tab-all-logs').classList.toggle('active', tab === 'logs');
    document.getElementById('tab-defaulters').classList.toggle('active', tab === 'defaulters');
    document.getElementById('panel-table-title').textContent =
        tab === 'logs' ? 'Attendance records' : 'Below 75% attendance';

    loadAttendance();
}

async function loadAttendance() {
    const tbody = document.getElementById('attendance-tbody');
    const thead = document.getElementById('attendance-thead');

    tbody.innerHTML = `<tr><td colspan="6" class="loading-row">Loading…</td></tr>`;

    const courseId = document.getElementById('attendance-filter-course').value;
    const date = document.getElementById('attendance-filter-date').value;

    if (activeTab === 'logs') {
        thead.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Student</th>
                <th>Course</th>
                <th>Date</th>
                <th>Status</th>
                <th class="cell-right">Toggle</th>
            </tr>
        `;

        const params = new URLSearchParams();
        if (courseId) params.append('course_id', courseId);
        if (date) params.append('date', date);

        try {
            const res = await apiFetch(`/api/attendance?${params.toString()}`);
            const logs = res.data;

            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="loading-row">No attendance records found.</td></tr>`;
                return;
            }

            tbody.innerHTML = logs.map(l => `
                <tr>
                    <td class="mono cell-muted">${l.attendance_id}</td>
                    <td>
                        <div class="cell-primary">${escapeHtml(l.student_name)}</div>
                        <div class="cell-sub">${escapeHtml(l.dept_name)}</div>
                    </td>
                    <td>${escapeHtml(l.course_name)}</td>
                    <td class="mono cell-muted">${l.date}</td>
                    <td>
                        <span class="status ${l.status === 'Present' ? 'status-present' : 'status-absent'}">
                            ${l.status}
                        </span>
                    </td>
                    <td class="cell-right">
                        <button class="table-action" onclick="toggleAttendance(${l.student_id}, ${l.course_id}, '${l.date}', '${l.status === 'Present' ? 'Absent' : 'Present'}')">
                            Mark ${l.status === 'Present' ? 'absent' : 'present'}
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            showToast('Could not load attendance', err.message, 'error');
        }

        return;
    }

    thead.innerHTML = `
        <tr>
            <th>Student</th>
            <th>Department</th>
            <th>Course</th>
            <th>Total</th>
            <th>Attended</th>
            <th class="cell-right">Percentage</th>
        </tr>
    `;

    const params = new URLSearchParams();
    if (courseId) params.append('course_id', courseId);

    try {
        const res = await apiFetch(`/api/attendance/defaulters?${params.toString()}`);
        const defaulters = res.data;

        if (defaulters.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="loading-row">No students below 75% attendance.</td></tr>`;
            return;
        }

        tbody.innerHTML = defaulters.map(d => `
            <tr>
                <td>
                    <div class="cell-primary">${escapeHtml(d.student_name)}</div>
                    <div class="cell-sub">${escapeHtml(d.email)}</div>
                </td>
                <td>${escapeHtml(d.dept_name)}</td>
                <td>${escapeHtml(d.course_name)}</td>
                <td class="mono">${d.total_lectures}</td>
                <td class="mono">${d.attended_lectures}</td>
                <td class="mono cell-right status-absent">${Number(d.attendance_percentage).toFixed(2)}%</td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Could not load defaulters', err.message, 'error');
    }
}

async function toggleAttendance(studentId, courseId, date, status) {
    try {
        await apiFetch('/api/attendance', {
            method: 'POST',
            body: { student_id: studentId, course_id: courseId, date, status }
        });
        showToast('Updated', `Attendance marked ${status.toLowerCase()}.`, 'success');
        loadAttendance();
    } catch (err) {
        showToast('Could not update attendance', err.message, 'error');
    }
}

async function handleSaveAttendance(event) {
    event.preventDefault();

    const body = {
        student_id: document.getElementById('mark-student-select').value,
        course_id: document.getElementById('mark-course-select').value,
        date: document.getElementById('mark-date').value,
        status: document.getElementById('mark-status').value
    };

    try {
        await apiFetch('/api/attendance', { method: 'POST', body });
        showToast('Recorded', `Attendance marked ${body.status.toLowerCase()}.`, 'success');
        closeModal('mark-modal');
        loadAttendance();
    } catch (err) {
        showToast('Could not mark attendance', err.message, 'error');
    }
}

async function handleRunProcedure() {
    const studentId = document.getElementById('proc-student').value;
    const courseId = document.getElementById('proc-course').value;

    if (!studentId || !courseId) {
        showToast('Selection required', 'Choose a student and a course.', 'error');
        return;
    }

    try {
        const res = await apiFetch(`/api/attendance/percentage?student_id=${studentId}&course_id=${courseId}`);
        const data = res.data;

        document.getElementById('proc-result-box').classList.remove('hidden');
        document.getElementById('proc-res-student').textContent = data.student_name;
        document.getElementById('proc-res-course').textContent = data.course_name;
        document.getElementById('proc-res-percent').textContent = `${Number(data.attendance_percentage).toFixed(2)}%`;
        document.getElementById('proc-res-total').textContent = data.total_classes;
        document.getElementById('proc-res-attended').textContent = data.attended_classes;
        document.getElementById('proc-res-absent').textContent = data.absent_classes;

        const remark = document.getElementById('proc-res-remark');
        remark.textContent = data.status_remark;
        remark.className = `status ${Number(data.attendance_percentage) >= 75 ? 'status-present' : 'status-absent'}`;
    } catch (err) {
        showToast('Procedure failed', err.message, 'error');
    }
}
