// Simple animations for landing page
document.addEventListener('DOMContentLoaded', () => {
    // Smooth scroll for CTA button
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', (e) => {
            // Add click animation
            ctaButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
                ctaButton.style.transform = '';
            }, 150);
        });
    }
});
