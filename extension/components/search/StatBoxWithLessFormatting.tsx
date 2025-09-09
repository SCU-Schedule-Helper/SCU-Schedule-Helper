import { Box, Typography } from "@mui/material";
import { getRatingColor, getPercentile } from "../utils/ratings";
interface StatBoxWithLessFormattingProps {
  label: string;
  value: number;
  preferredPercentiles: Record<string, number>;
  deptStats: number[];
  isRmpRating: boolean;
}
export default function StatBoxWithLessFormatting({
  label,
  value,
  preferredPercentiles,
  deptStats,
  isRmpRating,
}: StatBoxWithLessFormattingProps) {
  label = label.toLowerCase();
  
  function getColor(value: number, label: string, isRmpRating: boolean) {
    if (isRmpRating) {
      if (label === "quality") return getRatingColor(value, 1, 5, true);
      const diffScore = Math.abs(
        preferredPercentiles.difficulty * 4 - value + 1,
      );
      return getRatingColor(diffScore, 0, 4, false);
    }
    // Assume deptStats always contains data; assert non-null
    const percentile = getPercentile(value, deptStats)!;
    const score = 100 - Math.abs(preferredPercentiles[label] - percentile) * 100;
    return getRatingColor(score, 0, 100, true);
  }

  return (
    <Box sx={{ display: "flex", alignItems: "baseline" }}>
      <Typography
        variant="h6"
        sx={{
          color: getColor(value, label, isRmpRating),
          fontWeight: "bold",
          ...(label === "workload" ? { minWidth: "2.5rem", textAlign: "center" } : {}),
        }}
      >
        {value.toFixed(1)}
      </Typography>
    </Box>
  );
}
