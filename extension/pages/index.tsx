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
      url: chrome.runtime.getURL("index.html?detached=true"),
      type: "popup",
      width: 475,
      height: 500,
      focused: true,
      state: "normal" // Allow resizing
    });
  }

  // Check URL parameter to determine if this is a detached window
  function checkWindowType() {
    const urlParams = new URLSearchParams(window.location.search);
    const isDetached = urlParams.get('detached') === 'true';
    setIsDetachedWindow(isDetached);
  }

  useEffect(() => {
    chrome.runtime.sendMessage("runStartupChecks");
    checkWindowType();
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
        isDetachedWindow={isDetachedWindow}
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
