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

// Theme Toggle Logic for Login Screen
const themeToggleBtn = document.getElementById('themeToggleBtn');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const root = document.documentElement;
        const currentTheme = root.classList.contains('light-theme') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        if (newTheme === 'light') {
            root.classList.add('light-theme');
        } else {
            root.classList.remove('light-theme');
        }
        
        localStorage.setItem('theme', newTheme);
    });
}
