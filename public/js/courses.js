let deleteCourseId = null;
let coursesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuthStatus();
    if (!user) return;

    await loadDropdowns();
    loadCourses();

    document.getElementById('course-filter-dept').addEventListener('change', loadCourses);

    document.getElementById('btn-add-course').addEventListener('click', () => {
        document.getElementById('course-form').reset();
        document.getElementById('course-id').value = '';
        document.getElementById('course-modal-title').textContent = 'Add course';
        openModal('course-modal');
    });

    document.getElementById('course-form').addEventListener('submit', handleSaveCourse);
    document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);
});

async function loadDropdowns() {
    try {
        const [deptsRes, facultyRes] = await Promise.all([
            apiFetch('/api/departments'),
            apiFetch('/api/faculty')
        ]);

        const filterDept = document.getElementById('course-filter-dept');
        const modalDept = document.getElementById('course-dept');
        const modalFaculty = document.getElementById('course-faculty');

        filterDept.innerHTML = '<option value="">All departments</option>';
        modalDept.innerHTML = '<option value="">Select department</option>';
        modalFaculty.innerHTML = '<option value="">Unassigned</option>';

        deptsRes.data.forEach(d => {
            const option = `<option value="${d.dept_id}">${escapeHtml(d.dept_name)}</option>`;
            filterDept.innerHTML += option;
            modalDept.innerHTML += option;
        });

        facultyRes.data.forEach(f => {
            modalFaculty.innerHTML += `<option value="${f.faculty_id}">${escapeHtml(f.name)} (${escapeHtml(f.dept_name)})</option>`;
        });
    } catch (err) {
        showToast('Could not load form options', err.message, 'error');
    }
}

async function loadCourses() {
    const tbody = document.getElementById('courses-tbody');
    tbody.innerHTML = `<tr><td colspan="7" class="loading-row">Loading…</td></tr>`;

    const deptId = document.getElementById('course-filter-dept').value;

    try {
        const res = await apiFetch(deptId ? `/api/courses?dept_id=${deptId}` : '/api/courses');
        coursesCache = res.data;

        if (coursesCache.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <h3>No courses found</h3>
                            <p>Add a course or choose another department.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = coursesCache.map(c => `
            <tr>
                <td class="mono cell-muted">${c.course_id}</td>
                <td class="cell-primary">${escapeHtml(c.course_name)}</td>
                <td class="mono">${c.credits}</td>
                <td>${escapeHtml(c.dept_name)}</td>
                <td class="cell-muted">${escapeHtml(c.faculty_name || 'Unassigned')}</td>
                <td class="mono">${c.enrolled_students_count}</td>
                <td class="cell-right">
                    <div class="table-actions">
                        <button class="table-action" onclick="openEditCourse(${c.course_id})">Edit</button>
                        <button class="table-action danger" onclick="promptDeleteCourse(${c.course_id})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Could not load courses', err.message, 'error');
        tbody.innerHTML = `<tr><td colspan="7" class="loading-row">Failed to load courses.</td></tr>`;
    }
}

function openEditCourse(courseId) {
    const course = coursesCache.find(c => c.course_id === courseId);
    if (!course) return;

    document.getElementById('course-id').value = course.course_id;
    document.getElementById('course-name').value = course.course_name;
    document.getElementById('course-credits').value = course.credits;
    document.getElementById('course-dept').value = course.dept_id;
    document.getElementById('course-faculty').value = course.faculty_id || '';
    document.getElementById('course-modal-title').textContent = `Edit course ${course.course_id}`;
    openModal('course-modal');
}

async function handleSaveCourse(event) {
    event.preventDefault();

    const courseId = document.getElementById('course-id').value;
    const body = {
        course_name: document.getElementById('course-name').value.trim(),
        credits: parseInt(document.getElementById('course-credits').value, 10),
        dept_id: document.getElementById('course-dept').value,
        faculty_id: document.getElementById('course-faculty').value || null
    };

    const isEdit = Boolean(courseId);
    const button = document.getElementById('btn-save-course');
    button.disabled = true;

    try {
        await apiFetch(isEdit ? `/api/courses/${courseId}` : '/api/courses', {
            method: isEdit ? 'PUT' : 'POST',
            body
        });
        showToast('Saved', `Course ${isEdit ? 'updated' : 'added'}.`, 'success');
        closeModal('course-modal');
        loadCourses();
    } catch (err) {
        showToast('Could not save course', err.message, 'error');
    } finally {
        button.disabled = false;
    }
}

function promptDeleteCourse(courseId) {
    const course = coursesCache.find(c => c.course_id === courseId);
    deleteCourseId = courseId;

    document.getElementById('delete-prompt-text').textContent =
        `Delete ${course ? course.course_name : 'this course'}? Courses with enrollments cannot be deleted.`;

    openModal('delete-modal');
}

async function handleConfirmDelete() {
    if (!deleteCourseId) return;

    try {
        await apiFetch(`/api/courses/${deleteCourseId}`, { method: 'DELETE' });
        showToast('Deleted', 'Course removed.', 'success');
        closeModal('delete-modal');
        deleteCourseId = null;
        loadCourses();
    } catch (err) {
        showToast('Could not delete course', err.message, 'error');
        closeModal('delete-modal');
    }
}
