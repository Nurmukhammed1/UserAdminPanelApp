document.getElementById('showRegister').addEventListener('click', function (e) {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    clearAlerts();
});

document.getElementById('showLogin').addEventListener('click', function (e) {
    e.preventDefault();
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    clearAlerts();
});


function clearAlerts() {
    ['loginAlert', 'registerAlert'].forEach(alertId => {
        document.getElementById(alertId).classList.add('d-none');
    });
}


function showAlert(alertId, message, type = 'danger') {
    const alert = document.getElementById(alertId);
    const alertText = document.getElementById(alertId.replace('Alert', 'AlertText'));

    alert.className = `alert alert-${type}`;
    alertText.textContent = message;
    alert.classList.remove('d-none');
}

document.getElementById('loginFormElement').addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    fetch('https://user-admin-panel.runasp.net/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        referrerPolicy: "unsafe-url"
    })
    .then(response => response.json())
    .then(responseData => { 
        if (responseData.success && responseData.data) { 
            const apiData = responseData.data; 

            if (apiData.token) {
                localStorage.setItem('authToken', apiData.token);
            } else {
                console.error('Login successful, but token is missing in API response data.');
                showAlert('loginAlert', 'Login error: Token not found.');
                return; 
            }

            if (apiData.user && typeof apiData.user === 'object') {
                localStorage.setItem('currentUser', JSON.stringify(apiData.user));
            } else {
                localStorage.removeItem('currentUser'); 
                console.warn('Login successful, but user data is missing or invalid in API response data.');
            }

            window.location.href = 'index.html';
        } else {
            showAlert('loginAlert', responseData.message || 'Login failed: Invalid response structure');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showAlert('loginAlert', 'Network error. Please try again.');
    });
});


document.getElementById('registerFormElement').addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    fetch('https://user-admin-panel.runasp.net/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
        referrerPolicy: "unsafe-url" 
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('registerAlert', 'Account created successfully! Please sign in.', 'success');
                setTimeout(() => {
                    document.getElementById('showLogin').click();
                }, 2000);
            } else {
                showAlert('registerAlert', data.message || 'Registration failed');
            }
        })
        .catch(error => {
            console.error('Registration error:', error);
            showAlert('registerAlert', 'Network error. Please try again.');
        });
});

if (localStorage.getItem('authToken')) {
    window.location.href = 'index.html';
}


