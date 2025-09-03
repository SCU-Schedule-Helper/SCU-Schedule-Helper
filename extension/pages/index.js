import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Main from "../components/pageComponents/main";
import Preferences from "../components/pageComponents/preferences";
import Menu from "../components/Menu";
import Friends from "../components/pageComponents/friends";
import Profile from "../components/pageComponents/profile";
import SettingsPage from "../components/pageComponents/settings";
import CoursePlannerPage from "../components/pageComponents/courseplanner";

export default function Home() {
  const [activePage, setActivePage] = useState("main");

  function navigateToPage(page) {
    setActivePage(page);
  }

  function openLandingPage() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("landing_page/index.html"),
    });
  }

  useEffect(() => {
    chrome.runtime.sendMessage("runStartupChecks");
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        minWidth: "400px",
        minHeight: "485px",
      }}
      className="extension-container"
    >
      <Menu navigateToPage={navigateToPage} openLandingPage={openLandingPage} />

      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          overflowX: "hidden",
          width: "100%",
          position: "relative",
          paddingBottom: "20px",
        }}
        className="content-area"
      >
        {activePage === "main" && <Main />}
        {activePage === "preferences" && <Preferences />}
        {activePage === "friends" && <Friends />}
        {activePage === "profile" && <Profile />}
        {activePage === "settings" && <SettingsPage />}
        {activePage === "courseplanner" && <CoursePlannerPage />}
      </Box>
    </Box>
  );
}
