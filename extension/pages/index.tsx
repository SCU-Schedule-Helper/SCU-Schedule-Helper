import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import NavMenu from "../components/NavMenu";
import SearchPage from "../components/search/SearchPage";
import PreferencesPage from "../components/preferences/PreferencesPage";
import FriendsPage from "../components/friends/FriendsPage";
import ProfilePage from "../components/profile/ProfilePage";

export default function Home() {
  const [activePage, setActivePage] = useState<string>("main");
  const [isDetachedWindow, setIsDetachedWindow] = useState(false);

  function navigateToPage(page: string): void {
    setActivePage(page);
  }

  function openLandingPage(): void {
    chrome.tabs.create({ url: chrome.runtime.getURL("landing_page/index.html") });
  }

  function openInDetachedWindow(): void {
    // Close the original popup first
    window.close();
    
    // Create a new window with the extension popup content
    chrome.windows.create({
      url: chrome.runtime.getURL("index.html"),
      type: "popup",
      width: 475,
      height: 500,
      focused: true,
      state: "normal" // Allow resizing
    }, (newWindow) => {
      // Enhanced measures to prevent Google Translate in the new window
      if (newWindow && newWindow.id) {
        // Wait for the tab to load completely before injecting scripts
        const injectAntiTranslateScript = () => {
          chrome.tabs.query({ windowId: newWindow.id }, (tabs) => {
            if (tabs[0]) {
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id! },
                func: () => {
                  // Enhanced Google Translate blocking
                  if (typeof window !== 'undefined') {
                    // Add notranslate class immediately
                    document.documentElement.classList.add('notranslate');
                    document.body.classList.add('notranslate');
                    
                    // Add notranslate meta tag
                    const metaTag = document.createElement('meta');
                    metaTag.name = 'google';
                    metaTag.content = 'notranslate';
                    document.head.appendChild(metaTag);
                    
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
                        elements.forEach(el => el.remove());
                      });
                      
                      // Also remove any iframes that might contain Google Translate
                      const iframes = document.querySelectorAll('iframe[src*="translate.googleapis.com"]');
                      iframes.forEach(iframe => iframe.remove());
                    };
                    
                    // Run immediately and on DOM ready
                    removeGoogleTranslate();
                    if (document.readyState === 'loading') {
                      document.addEventListener('DOMContentLoaded', removeGoogleTranslate);
                    }
                    
                    // Watch for new elements
                    const observer = new MutationObserver((mutations) => {
                      let shouldRemove = false;
                      mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                          if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            if (element.id?.includes('google_translate') || 
                                element.className?.includes('goog-te') ||
                                element.id?.includes('goog-te')) {
                              shouldRemove = true;
                            }
                          }
                        });
                      });
                      if (shouldRemove) {
                        removeGoogleTranslate();
                      }
                    });
                    
                    observer.observe(document.body, { 
                      childList: true, 
                      subtree: true,
                      attributes: true,
                      attributeFilter: ['id', 'class']
                    });
                    
                    // Prevent right-click context menu
                    document.addEventListener('contextmenu', (e) => {
                      e.preventDefault();
                      return false;
                    }, { capture: true });
                    
                    // Block keyboard shortcuts that might trigger translate
                    document.addEventListener('keydown', (e) => {
                      // Block Ctrl+Shift+T (common translate shortcut)
                      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                      }
                      return true;
                    }, { capture: true });
                    
                    // Override any existing translate functions
                    if ((window as any).google && (window as any).google.translate) {
                      (window as any).google.translate = null;
                    }
                    
                    console.log('Google Translate blocking measures activated');
                  }
                }
              }, () => {
                if (chrome.runtime.lastError) {
                  console.log('Script injection failed:', chrome.runtime.lastError.message);
                  // Retry after a short delay
                  setTimeout(injectAntiTranslateScript, 100);
                }
              });
            }
          });
        };
        
        // Inject immediately and also after a delay to catch any late-loading elements
        setTimeout(injectAntiTranslateScript, 100);
        setTimeout(injectAntiTranslateScript, 500);
        setTimeout(injectAntiTranslateScript, 1000);
      }
    });
  }

  useEffect(() => {
    chrome.runtime.sendMessage("runStartupChecks");
    
    // Detect if we're in a detached window by checking window dimensions
    const checkWindowType = () => {
      // Based on the console logs, the actual popup dimensions are around 466x491
      // So we need to adjust our detection threshold
      const isDetached = window.innerWidth > 500 || window.innerHeight > 550;
      console.log('Window dimensions:', window.innerWidth, 'x', window.innerHeight, 'isDetached:', isDetached);
      setIsDetachedWindow(isDetached);
    };
    
    // Add a small delay to ensure window dimensions are set
    setTimeout(checkWindowType, 100);
    window.addEventListener('resize', checkWindowType);
    
    return () => {
      window.removeEventListener('resize', checkWindowType);
    };
  }, []);

  return (
    <Box
      sx={{
        width: isDetachedWindow ? "100%" : "450px",
        height: isDetachedWindow ? "100vh" : "500px",
        minWidth: "350px",
        minHeight: "400px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <NavMenu
        navigateToPage={navigateToPage}
        openLandingPage={openLandingPage}
        openInDetachedWindow={openInDetachedWindow}
      />

      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          overflowX: "hidden",
          width: "100%",
          position: "relative",
          paddingBottom: "20px",
        }}
      >
        {activePage === "main" && <SearchPage />}
        {activePage === "preferences" && <PreferencesPage />}
        {activePage === "friends" && <FriendsPage />}
        {activePage === "profile" && <ProfilePage />}
      </Box>
    </Box>
  );
}
