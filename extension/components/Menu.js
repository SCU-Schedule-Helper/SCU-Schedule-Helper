import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";
import Typography from "@mui/material/Typography";
import {
  Home,
  AccountCircle,
  Search,
  Tune,
  PersonAdd,
  Close,
  ExpandMore,
  ExpandLess,
  Settings,
} from "@mui/icons-material";
import AnnouncementBar from "./AnnouncementBar";

export const supportEmail = "swdean@scu.edu";

export default function Menu({ navigateToPage, openLandingPage }) {
  const [activeMenu, setActiveMenu] = useState("main");
  const [friendNotificationCount, setFriendNotificationCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    async function updateFriendNotificationCount() {
      try {
        const { friendRequestsIn } =
          await chrome.storage.local.get("friendRequestsIn");
        if (!friendRequestsIn) return;
        setFriendNotificationCount(Object.values(friendRequestsIn).length);
      } catch (error) {
        console.error("Error fetching friend data:", error);
      }
    }

    updateFriendNotificationCount();
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.friendRequestsIn) {
        updateFriendNotificationCount();
      }
    });
  }, []);

  // Define all menu items organized in rows
  const topRowItems = [
    { 
      icon: <Search />, 
      id: "main", 
      label: "Search",
      action: () => navigateToPage("main") 
    },
    {
      icon: <PersonAdd />,
      id: "friends",
      label: "Friends",
      action: () => navigateToPage("friends"),
    },
    {
      icon: <AccountCircle />,
      id: "profile",
      label: "Profile",
      action: () => navigateToPage("profile"),
    },
  ];

  const bottomRowItems = [
    {
      icon: <Tune />,
      id: "preferences",
      label: "Preferences",
      action: () => navigateToPage("preferences"),
    },
  ];

  useEffect(() => {
    setActiveMenu("main");
  }, []);

  function handleClose() {
    window.close();
  }

  function toggleExpanded() {
    setIsExpanded(!isExpanded);
  }

  const renderMenuButton = (item, isInRow = false) => (
    <Button
      key={item.id}
      sx={{
        padding: "4px 8px",
        position: "relative",
        color: "black",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 0.5,
        borderRadius: "4px",
        backgroundColor: activeMenu === item.id ? "#f8f4f3" : "white",
        border: "1px solid #e0e0e0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        minHeight: "28px",
        width: "auto",
        minWidth: "fit-content",
        "&:hover": {
          backgroundColor: "#f0f0f0",
          borderColor: "#703331",
          transform: "translateY(-1px)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          "& .menu-icon": {
            color: "#703331",
          },
        },
        transition: "all 0.2s ease-in-out",
        ...(activeMenu === item.id && {
          borderColor: "#703331",
          boxShadow: "0 2px 6px rgba(112, 51, 49, 0.2)",
        }),
      }}
      onClick={() => {
        setActiveMenu(item.id);
        item.action();
      }}
    >
      {item.id === "friends" ? (
        <Badge
          badgeContent={friendNotificationCount}
          sx={{
            "& .MuiBadge-badge": {
              fontSize: 10,
              height: 15,
              minWidth: 15,
              backgroundColor: "firebrick",
              color: "white",
            },
          }}
        >
          {React.cloneElement(item.icon, {
            className: "menu-icon",
            sx: {
              fontSize: 18,
              color: activeMenu === item.id ? "#703331" : "#d1d1d1",
              transition: "color 0.3s",
              flexShrink: 0,
            },
          })}
        </Badge>
      ) : (
        React.cloneElement(item.icon, {
          className: "menu-icon",
          sx: {
            fontSize: 18,
            color: activeMenu === item.id ? "#703331" : "#d1d1d1",
            transition: "color 0.3s",
            flexShrink: 0,
          },
        })
      )}
      <Typography
        variant="body2"
        sx={{
          color: activeMenu === item.id ? "#703331" : "black",
          fontWeight: activeMenu === item.id ? "bold" : "normal",
          fontSize: "0.7rem",
          whiteSpace: "nowrap",
          overflow: "visible",
          textOverflow: "clip",
        }}
      >
        {item.label}
      </Typography>
    </Button>
  );

  return (
    <Box sx={{ mb: 1, width: "100%" }}>
      {/* Announcement Bar */}
      <AnnouncementBar />

      <AppBar
        position="static"
        sx={{
          backgroundColor: "white",
          boxShadow: "none",
          borderBottom: "2px solid #d1d1d1",
          width: "100%",
        }}
      >
        {/* Top Row: SCU Schedule Helper, Menu Toggle, and Close Button */}
        <Toolbar
          disableGutters
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "white",
            minHeight: "56px",
          }}
        >
          <Button
            sx={{
              position: "relative",
              color: "black",
              display: "flex",
              alignItems: "center",
              padding: "4px 4px",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#f0f0f0",
                "& .MuiSvgIcon-root": {
                  color: "#703331",
                },
                "&::after": {
                  backgroundColor: "#703331 !important",
                  width: "100% !important",
                },
              },
              "&::after": {
                content: '"" !important',
                position: "absolute",
                bottom: -2,
                left: 0,
                right: 0,
                height: "2px",
                width: 0,
                backgroundColor: "transparent",
                transition: "background-color 0.3s, width 0.3s",
                zIndex: 1,
              },
              ...(activeMenu === "home" && {
                "&::after": {
                  backgroundColor: "#703331 !important",
                  width: "100% !important",
                },
              }),
              whiteSpace: "nowrap",
            }}
            onClick={() => {
              setActiveMenu("home");
              openLandingPage();
            }}
            className={activeMenu === "home" ? "active" : ""}
          >
            <Home
              sx={{
                fontSize: 24,
                color: activeMenu === "home" ? "#703331" : "#d1d1d1",
                marginRight: 1,
                transition: "color 0.3s",
                "&:hover, button:hover &": {
                  color: "#703331",
                },
              }}
            />
            <Typography
              sx={{
                color: activeMenu === "home" ? "#703331" : "black",
                fontWeight: "bold",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              SCU SCHEDULE HELPER
            </Typography>
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              onClick={toggleExpanded}
              sx={{
                minWidth: "auto",
                padding: "4px 12px",
                color: "#703331",
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderRadius: "4px",
                position: "relative",
                "&:hover": {
                  backgroundColor: "#f0f0f0",
                  "& .MuiSvgIcon-root": {
                    color: "#703331",
                  },
                  "&::after": {
                    backgroundColor: "#703331",
                    width: "100%",
                  },
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: -2,
                  left: 0,
                  right: 0,
                  height: "2px",
                  width: 0,
                  backgroundColor: "transparent",
                  transition: "background-color 0.3s, width 0.3s",
                },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  color: "#703331",
                  fontWeight: "bold",
                }}
              >
                Menu
              </Typography>
              {isExpanded ? (
                <ExpandLess sx={{ fontSize: 16 }} />
              ) : (
                <ExpandMore sx={{ fontSize: 16 }} />
              )}
            </Button>

            <Button
              onClick={() => {
                setActiveMenu("settings");
                navigateToPage("settings");
              }}
              sx={{
                minWidth: "auto",
                color: "#703331",
                padding: "4px 8px",
                position: "relative",
                "&:hover": {
                  backgroundColor: "#f0f0f0",
                  "& .MuiSvgIcon-root": {
                    color: "#703331",
                  },
                  "&::after": {
                    backgroundColor: "#703331",
                    width: "100%",
                  },
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: -2,
                  left: 0,
                  right: 0,
                  height: "2px",
                  width: 0,
                  backgroundColor: "transparent",
                  transition: "background-color 0.3s, width 0.3s",
                },
                ...(activeMenu === "settings" && {
                  "&::after": {
                    backgroundColor: "#703331",
                    width: "100%",
                  },
                }),
              }}
            >
              <Settings
                sx={{
                  fontSize: 24,
                  color: activeMenu === "settings" ? "#703331" : "#d1d1d1",
                  transition: "color 0.3s",
                }}
              />
            </Button>

            <Button
              onClick={handleClose}
              sx={{
                minWidth: "auto",
                color: "#703331",
                padding: "4px 8px",
                position: "relative",
                "&:hover": {
                  backgroundColor: "#f0f0f0",
                  "& .MuiSvgIcon-root": {
                    color: "#703331",
                  },
                  "&::after": {
                    backgroundColor: "#703331",
                    width: "100%",
                  },
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: -2,
                  left: 0,
                  right: 0,
                  height: "2px",
                  width: 0,
                  backgroundColor: "transparent",
                  transition: "background-color 0.3s, width 0.3s",
                },
              }}
            >
              <Close
                sx={{
                  fontSize: 24,
                  color: "#d1d1d1",
                  transition: "color 0.3s",
                }}
              />
            </Button>
          </Box>
        </Toolbar>

        {/* Expandable Navigation Menu */}
        {isExpanded && (
          <Box
            sx={{
              backgroundColor: "#fafafa",
              borderTop: "2px solid #d1d1d1",
              py: 1,
              px: 0,
              width: "100%",
            }}
          >
            <Box sx={{ maxWidth: "90%", mx: "auto", px: 2 }}>
              {/* All Navigation Buttons */}
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  rowGap: 0.5,
                }}
              >
                {[...topRowItems, ...bottomRowItems].map((item) => renderMenuButton(item, true))}
              </Box>
            </Box>
          </Box>
        )}
      </AppBar>
    </Box>
  );
}