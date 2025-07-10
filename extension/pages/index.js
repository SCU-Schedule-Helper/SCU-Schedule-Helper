import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Main from "../components/pageComponents/main";
import Preferences from "../components/pageComponents/preferences";
import Menu from "../components/Menu";
import Friends from "../components/pageComponents/friends";
import Profile from "../components/pageComponents/profile";
import SettingsPage from "../components/pageComponents/settings";
import CoursePlannerPage from "../components/pageComponents/courseplanner";
import ChatAssistantPage from "../components/pageComponents/chatassistant";

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
        width: "450px",
        height: "500px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",

      }}
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
      >
        {activePage === "main" && <Main />}
        {activePage === "preferences" && <Preferences />}
        {activePage === "friends" && <Friends />}
        {activePage === "profile" && <Profile />}
        {activePage === "settings" && <SettingsPage />}
        {activePage === "courseplanner" && <CoursePlannerPage />}
        {activePage === "chatassistant" && <ChatAssistantPage />}
      </Box>
    </Box>
  );
}
