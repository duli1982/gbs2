// Lazy Loading for Background Images and Heavy Content
(function() {
    'use strict';
    
    // Lazy load background images
    function initLazyBackgrounds() {
        const lazyBgs = document.querySelectorAll('.lazy-bg');
        
        if ('IntersectionObserver' in window) {
            const bgObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const bg = entry.target;
                        const bgUrl = bg.dataset.bg;
                        
                        if (bgUrl) {
                            bg.style.backgroundImage = `url(${bgUrl})`;
                            bg.classList.add('loaded');
                        }
                        
                        bgObserver.unobserve(bg);
                    }
                });
            }, {
                rootMargin: '50px'
            });
            
            lazyBgs.forEach(bg => bgObserver.observe(bg));
        } else {
            // Fallback for older browsers
            lazyBgs.forEach(bg => {
                const bgUrl = bg.dataset.bg;
                if (bgUrl) {
                    bg.style.backgroundImage = `url(${bgUrl})`;
                }
            });
        }
    }
    
    // Lazy load heavy content sections
    function initLazyContent() {
        const lazyContent = document.querySelectorAll('.lazy-content');
        
        if ('IntersectionObserver' in window) {
            const contentObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const content = entry.target;
                        content.classList.add('loaded');
                        contentObserver.unobserve(content);
                    }
                });
            }, {
                rootMargin: '100px'
            });
            
            lazyContent.forEach(content => contentObserver.observe(content));
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initLazyBackgrounds();
            initLazyContent();
        });
    } else {
        initLazyBackgrounds();
        initLazyContent();
    }
})();