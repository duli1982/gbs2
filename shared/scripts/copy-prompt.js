// Copy Prompt Button - Shared Utility
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('[data-copy-target]');
    if (!buttons.length) {
        return;
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return Promise.resolve();
    }

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-copy-target');
            const target = document.getElementById(targetId);
            if (!target) {
                return;
            }
            const text = target.textContent || '';
            const originalLabel = button.textContent;
            copyText(text)
                .then(() => {
                    button.textContent = 'Copied';
                    button.disabled = true;
                    setTimeout(() => {
                        button.textContent = originalLabel;
                        button.disabled = false;
                    }, 1500);
                })
                .catch(() => {
                    button.textContent = 'Copy failed';
                    setTimeout(() => {
                        button.textContent = originalLabel;
                    }, 1500);
                });
        });
    });
});
