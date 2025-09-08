import React from "react";
import { Box, LinearProgress } from "@mui/material";

interface Fraction {
  numerator: number;
  denominator: number;
}

export default function LinearWithValueLabel({
  numerator,
  denominator,
}: Fraction) {
  return (
    <Box sx={{ width: "100%", padding: 0 }}>
      <LinearProgress
        sx={{ padding: 0 }}
        variant="determinate"
        value={denominator === 0 ? 0 : (numerator / denominator) * 100}
      />
    </Box>
  );
}
