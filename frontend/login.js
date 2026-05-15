document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    if (user === 'admin' && pass === 'admin123') {
        window.location.href = 'dashboard.html';
    } else {
        errorMsg.innerText = 'Invalid credentials. Try admin / admin123';
    }
});
