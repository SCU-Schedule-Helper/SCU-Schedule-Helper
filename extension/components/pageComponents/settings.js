import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Settings } from "@mui/icons-material";

export default function SettingsPage() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: 3,
        textAlign: "center",
      }}
    >
      <Settings
        sx={{
          fontSize: 64,
          color: "#d1d1d1",
          marginBottom: 2,
        }}
      />
      <Typography
        variant="h5"
        sx={{
          color: "#703331",
          fontWeight: "bold",
          marginBottom: 1,
        }}
      >
        Settings
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: "#666",
          maxWidth: "300px",
        }}
      >
        Settings feature coming soon! We're working hard to bring you more customization options.
      </Typography>
    </Box>
  );
} 