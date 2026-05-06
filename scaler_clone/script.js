// Simple interactions for Scaler Clone
document.addEventListener('DOMContentLoaded', () => {
    console.log('Scaler Clone Loaded');

    const primaryBtn = document.querySelector('.primary-btn');
    const secondaryBtn = document.querySelector('.secondary-btn');

    primaryBtn.addEventListener('click', () => {
        alert('Welcome to Scaler! Exploring programs...');
    });

    secondaryBtn.addEventListener('click', () => {
        alert('Request received. Our team will call you soon.');
    });

    // Smooth scroll for nav links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            console.log(`Navigating to ${e.target.textContent}`);
        });
    });
});
