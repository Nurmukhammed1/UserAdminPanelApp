let users = [];
let selectedUsers = new Set();
let currentUser = null;


document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    initializeAuth();
    loadCurrentUser();
    loadUsers();
    initializeTooltips();
});


function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}


function initializeAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

}


function loadCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        currentUser = JSON.parse(userStr);
        document.getElementById('currentUserName').textContent = currentUser.name;
    }
}


function loadUsers() {
    showLoading(true);

    const token = localStorage.getItem('authToken');

    fetch('https://user-admin-panel.runasp.net/api/users', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = 'index.html';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                users = data.data;
                renderUsers();
            } else {
                showError('Failed to load users');
            }
        })
        .catch(error => {
            console.error('Load users error:', error);
            showError('Network error. Please try again.');
        })
        .finally(() => {
            showLoading(false);
        });
}


function renderUsers() {
    const tbody = document.getElementById('usersTableBody');

    if (users.length === 0) {
        document.getElementById('emptyState').classList.remove('d-none');
        document.querySelector('.table-container').style.display = 'none';
        document.querySelector('.toolbar').style.display = 'none';
        return;
    }

    document.getElementById('emptyState').classList.add('d-none');
    document.querySelector('.table-container').style.display = 'block';
    document.querySelector('.toolbar').style.display = 'flex';

    users.sort((a, b) => new Date(b.lastLoginTime || 0) - new Date(a.lastLoginTime || 0));

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="form-check">
                    <input class="form-check-input user-checkbox" type="checkbox" 
                           value="${user.id}" ${selectedUsers.has(user.id) ? 'checked' : ''}>
                </div>
            </td>
            <td>
                <div>
                    <div class="user-name">${escapeHtml(user.name)}</div>
                    <div class="user-title">${user.title || 'N/A'}</div>
                </div>
            </td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <div class="last-seen">${formatLastSeen(user.lastLoginTime)}</div>
                <div class="activity-chart"></div>
            </td>
            <td>
                <span class="status-badge ${user.status === 'active' ? 'status-active' : 'status-blocked'}">
                    ${user.status}
                </span>
            </td>
        </tr>
    `).join('');

    updateCheckboxStates();
}


function initializeEventListeners() {
    document.getElementById('selectAll').addEventListener('change', function () {
        const isChecked = this.checked;
        selectedUsers.clear();

        if (isChecked) {
            users.forEach(user => selectedUsers.add(user.id));
        }

        document.querySelectorAll('.user-checkbox').forEach(cb => {
            cb.checked = isChecked;
        });

        updateToolbarButtons();
        updateSelectionCount();
    });

    document.getElementById('usersTableBody').addEventListener('change', function (e) {
        if (e.target.classList.contains('user-checkbox')) {
            const userId = parseInt(e.target.value);

            if (e.target.checked) {
                selectedUsers.add(userId);
            } else {
                selectedUsers.delete(userId);
            }

            updateCheckboxStates();
            updateToolbarButtons();
            updateSelectionCount();
        }
    });

    document.getElementById('blockBtn').addEventListener('click', () => performAction('block'));
    document.getElementById('unblockBtn').addEventListener('click', () => performAction('unblock'));
    document.getElementById('deleteBtn').addEventListener('click', () => performAction('delete'));
    document.getElementById('refreshBtn').addEventListener('click', loadUsers);

    document.getElementById('logoutBtn').addEventListener('click', function (e) {
        console.log('Logout button was clicked! Handler started.');
        e.preventDefault();
        localStorage.clear();
        console.log('localStorage has been cleared. authToken:', localStorage.getItem('authToken'));
        window.location.href = 'login.html';
    });
}


function updateCheckboxStates() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    const checkedCount = selectedUsers.size;
    const totalCount = users.length;

    if (checkedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedCount === totalCount) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
        selectAllCheckbox.checked = false;
    }
}

function updateToolbarButtons() {
    const hasSelection = selectedUsers.size > 0;

    document.getElementById('blockBtn').disabled = !hasSelection;
    document.getElementById('unblockBtn').disabled = !hasSelection;
    document.getElementById('deleteBtn').disabled = !hasSelection;
}

function updateSelectionCount() {
    const count = selectedUsers.size;
    document.getElementById('selectionCount').textContent =
        count === 0 ? 'None selected' : `${count} selected`;
}

function performAction(action) {
    if (selectedUsers.size === 0) return;

    const userIds = Array.from(selectedUsers);
    const token = localStorage.getItem('authToken');

    fetch(`/api/users/${action}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userIds })
    })
        .then(response => {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = 'index.html';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showSuccess(data.message || `${action} completed successfully`);
                selectedUsers.clear();
                loadUsers();

                if (userIds.includes(currentUser.id) && (action === 'block' || action === 'delete')) {
                    setTimeout(() => {
                        localStorage.clear();
                        window.location.href = 'index.html';
                    }, 2000);
                }
            } else {
                showError(data.message || `${action} failed`);
            }
        })
        .catch(error => {
            console.error(`${action} error:`, error);
            showError('Network error. Please try again.');
        });
}

function showLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'block' : 'none';
    document.querySelector('.table-container').style.display = show ? 'none' : 'block';
    document.querySelector('.toolbar').style.display = show ? 'none' : 'flex';
}

function showSuccess(message) {
    const alert = document.getElementById('statusAlert');
    const alertText = document.getElementById('statusAlertText');

    alertText.textContent = message;
    alert.classList.remove('d-none');

    setTimeout(() => {
        alert.classList.add('d-none');
    }, 5000);
}

function showError(message) {
    const alert = document.getElementById('errorAlert');
    const alertText = document.getElementById('errorAlertText');

    alertText.textContent = message;
    alert.classList.remove('d-none');

    setTimeout(() => {
        alert.classList.add('d-none');
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatLastSeen(timestamp) {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} days ago`;

    return date.toLocaleDateString();
}

