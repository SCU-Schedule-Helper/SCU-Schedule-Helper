import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Campaign } from "@mui/icons-material";

export default function AnnouncementBar() {
  return (
    <Box
      sx={{
        backgroundColor: "#f5f5f5",
        borderBottom: "2px solid #d1d1d1",
        py: 1,
        px: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Campaign
          sx={{
            fontSize: 20,
            color: "#703331",
          }}
        />
        <Typography
          variant="body2"
          sx={{
            color: "#666",
            fontSize: "0.875rem",
          }}
        >
          Check out the export to gcal button in Workday!
        </Typography>
      </Box>
    </Box>
  );
} 