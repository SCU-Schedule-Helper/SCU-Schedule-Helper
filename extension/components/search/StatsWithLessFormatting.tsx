import { Box, Typography } from "@mui/material";
import StatBoxWithLessFormatting from "./StatBoxWithLessFormatting";
import { Evaluation, DepartmentStats } from "../utils/types";
interface Props {
  flexGap?: string | number;
  stats: Evaluation;
  deptStats: DepartmentStats;
  preferredPercentiles: Record<string, number>;
}

export default function StatsWithLessFormatting({ flexGap, stats, deptStats, preferredPercentiles }: Props) {
  if (
    !stats ||
    stats.qualityTotal === undefined ||
    stats.difficultyTotal === undefined ||
    stats.workloadTotal === undefined
  ) {
    return (
      <Typography variant="body2" color="text.secondary">
        No statistics available
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        gap: flexGap,
        justifyContent: "space-between",
        pr: "20px",
        pl: "5px",
      }}
    >
      <StatBoxWithLessFormatting
        label="Quality"
        value={stats.qualityTotal / stats.qualityCount}
        preferredPercentiles={preferredPercentiles}
        deptStats={deptStats.qualityAvgs}
        isRmpRating={false}
      />
      <StatBoxWithLessFormatting
        label="Difficulty"
        value={stats.difficultyTotal / stats.difficultyCount}
        preferredPercentiles={preferredPercentiles}
        deptStats={deptStats.difficultyAvgs}
        isRmpRating={false}
      />
      <StatBoxWithLessFormatting
        label="Workload"
        value={stats.workloadTotal / stats.workloadCount}
        preferredPercentiles={preferredPercentiles}
        deptStats={deptStats.workloadAvgs}
        isRmpRating={false}
      />
    </Box>
  );
}
