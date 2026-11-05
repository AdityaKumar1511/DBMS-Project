const NAV_GROUPS = [
    {
        title: 'Records',
        items: [
            { id: 'students', label: 'Students', href: 'students.html' },
            { id: 'departments', label: 'Departments', href: 'departments.html' },
            { id: 'courses', label: 'Courses', href: 'courses.html' },
            { id: 'faculty', label: 'Faculty', href: 'faculty.html' }
        ]
    },
    {
        title: 'Academics',
        items: [
            { id: 'enrollments', label: 'Enrollments', href: 'enrollments.html' },
            { id: 'marks', label: 'Marks', href: 'marks.html' },
            { id: 'attendance', label: 'Attendance', href: 'attendance.html' }
        ]
    },
    {
        title: 'Reports',
        items: [
            { id: 'report-card', label: 'Report card', href: 'report-card.html' }
        ]
    }
];

function renderShell() {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;

    const active = document.body.dataset.page || '';
    const links = `
        <a href="dashboard.html" class="nav-link${active === 'dashboard' ? ' active' : ''}"${active === 'dashboard' ? ' aria-current="page"' : ''}>Dashboard</a>
        ${NAV_GROUPS.map(group => `
            <div class="nav-section-title">${group.title}</div>
            ${group.items.map(item => `
                <a href="${item.href}" class="nav-link${item.id === active ? ' active' : ''}"${item.id === active ? ' aria-current="page"' : ''}>${item.label}</a>
            `).join('')}
        `).join('')}
    `;

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <div class="brand-text">
                <h1>Student Management</h1>
                <span>DBMS project</span>
            </div>
        </div>
        <nav class="sidebar-nav">${links}</nav>
        <div class="sidebar-footer">
            <div class="user-badge">
                <div class="user-meta">
                    <div class="name" id="sidebar-user-name">Admin</div>
                    <div class="role" id="sidebar-user-role">Administrator</div>
                </div>
                <button class="btn-logout" id="btn-logout">Sign out</button>
            </div>
        </div>
    `;
}

renderShell();
