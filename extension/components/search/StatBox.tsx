import { Box, Typography } from "@mui/material";
import { getPercentile, getRatingColor } from "../utils/ratings";

interface Props {
  label: string;
  value: number;
  preferredPercentiles: Record<string, number>;
  deptStats: number[];
  isRmpRating: boolean;
}

export default function StatBox({
  label,
  value,
  preferredPercentiles,
  deptStats,
  isRmpRating,
}: Props) {
  function getColor(value: number, label: string, isRmpRating: boolean) {
    label = label.toLowerCase();
    if (isRmpRating) {
      if (label === "quality") return getRatingColor(value, 1, 5, true);
      const diffScore = Math.abs(
        preferredPercentiles.difficulty! * 4 - value + 1,
      );
      return getRatingColor(diffScore, 0, 4, false);
    }
    const percentile = getPercentile(value, deptStats);
    const score = 100 - Math.abs(preferredPercentiles[label]! - percentile) * 100;
    return getRatingColor(score, 0, 100, true);
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline" }}>
        <Typography
          variant="h6"
          sx={{
            color: getColor(value, label, isRmpRating),
            fontWeight: "bold",
          }}
        >
          {value.toFixed(1)}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: "text.primary",
            fontWeight: "bold",
            ml: 0.5,
          }}
        >
          {label === "Workload" ? " hrs/week" : "/5"}
        </Typography>
      </Box>
    </Box>
  );
}
