// Enhanced Google Translate blocking for extension pages
(function() {
  'use strict';
  
  // Add notranslate class immediately
  if (document.documentElement) {
    document.documentElement.classList.add('notranslate');
  }
  if (document.body) {
    document.body.classList.add('notranslate');
  }
  
  // Add notranslate meta tag
  const addMetaTag = () => {
    if (document.head && !document.querySelector('meta[name="google"][content="notranslate"]')) {
      const metaTag = document.createElement('meta');
      metaTag.name = 'google';
      metaTag.content = 'notranslate';
      document.head.appendChild(metaTag);
    }
  };
  
  // Remove any Google Translate elements
  const removeGoogleTranslate = () => {
    const selectors = [
      '[id*="google_translate"]',
      '[class*="goog-te"]',
      '[id*="goog-te"]',
      '[class*="skiptranslate"]',
      '[id*="skiptranslate"]',
      '.goog-te-banner-frame',
      '#google_translate_element',
      '.goog-te-gadget'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => element.remove());
    });
    
    // Also remove any iframes that might contain Google Translate
    const iframes = document.querySelectorAll('iframe[src*="translate.googleapis.com"]');
    iframes.forEach(iframe => iframe.remove());
  };
  
  // Block keyboard shortcuts that might trigger translate
  const blockTranslateShortcuts = (event) => {
    // Block Ctrl+Shift+T (common translate shortcut)
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  };
  
  // Override any existing translate functions
  const overrideTranslateFunctions = () => {
    if (window.google && window.google.translate) {
      window.google.translate = null;
    }
  };
  
  // Initialize blocking measures
  const init = () => {
    addMetaTag();
    removeGoogleTranslate();
    overrideTranslateFunctions();
    
    // Add event listeners
    document.addEventListener('keydown', blockTranslateShortcuts, true);
    
    // Set up mutation observer to catch dynamically added translate elements
    if (window.MutationObserver) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              if (element.id?.includes('google_translate') || 
                  element.className?.includes('goog-te') ||
                  element.className?.includes('skiptranslate')) {
                element.remove();
              }
            }
          });
        });
      });
      
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    }
    
    console.log('Google Translate blocking measures activated');
  };
  
  // Run immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Also run on window load as a fallback
  window.addEventListener('load', () => {
    removeGoogleTranslate();
    addMetaTag();
  });
})();
