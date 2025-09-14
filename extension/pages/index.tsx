import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import NavMenu from "../components/NavMenu";
import SearchPage from "../components/search/SearchPage";
import PreferencesPage from "../components/preferences/PreferencesPage";
import FriendsPage from "../components/friends/FriendsPage";
import ProfilePage from "../components/profile/ProfilePage";

export default function Home() {
  const [activePage, setActivePage] = useState<string>("main");

  function navigateToPage(page: string): void {
    setActivePage(page);
  }

  function openLandingPage(): void {
    chrome.tabs.create({ url: chrome.runtime.getURL("landing_page/index.html") });
  }

  useEffect(() => {
    chrome.runtime.sendMessage("runStartupChecks");
  }, []);

  return (
    <Box
      sx={{
        width: "450px",
        height: "500px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <NavMenu
        navigateToPage={navigateToPage}
        openLandingPage={openLandingPage}
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
