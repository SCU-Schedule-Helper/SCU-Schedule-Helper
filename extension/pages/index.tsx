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
      width: 490,
      height: 499,
      focused: true,
      state: "normal" // Allow resizing
    }, (newWindow) => {
      // Additional measures to prevent Google Translate in the new window
      if (newWindow && newWindow.id) {
        // Inject script to prevent Google Translate
        chrome.tabs.query({ windowId: newWindow.id }, (tabs) => {
          if (tabs[0]) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id! },
              func: () => {
                // Block Google Translate detection
                if (typeof window !== 'undefined') {
                  // Remove any Google Translate elements
                  const removeGoogleTranslate = () => {
                    const elements = document.querySelectorAll('[id*="google_translate"], [class*="goog-te"], [id*="goog-te"]');
                    elements.forEach(el => el.remove());
                  };
                  
                  // Run immediately
                  removeGoogleTranslate();
                  
                  // Watch for new elements
                  const observer = new MutationObserver(removeGoogleTranslate);
                  observer.observe(document.body, { childList: true, subtree: true });
                  
                  // Prevent context menu
                  document.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    return false;
                  });
                  
                  // Add notranslate class to body
                  document.body.classList.add('notranslate');
                  document.documentElement.classList.add('notranslate');
                }
              }
            });
          }
        });
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
    
    // Alternative detection method - check if we're in a popup context
    const isPopupContext = () => {
      // Check if we're in a popup by looking at the window opener or other indicators
      return window.opener === null && window.name === '';
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
        width: isDetachedWindow ? "100%" : "466px",
        height: isDetachedWindow ? "100vh" : "491px",
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
