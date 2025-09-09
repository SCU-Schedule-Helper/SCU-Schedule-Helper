import { Box, CircularProgress, Typography } from "@mui/material";
import StatBox from "./StatBox";
import { RmpTeacher } from "../utils/types";

interface RmpStatsProps {
  rmpData: RmpTeacher | null;
  profName: string;
  isLoadingRmp: boolean;
  preferredPercentiles: Record<string, number>;
}

export default function RmpStats({
  rmpData,
  profName,
  isLoadingRmp,
  preferredPercentiles,
}: RmpStatsProps) {
  function getRmpLink() {
    if (rmpData && rmpData.legacyId) {
      return `https://www.ratemyprofessors.com/professor/${rmpData.legacyId}`;
    }
    return `https://www.ratemyprofessors.com/search/professors?q=${profName}`;
  }

  if (isLoadingRmp) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!rmpData) {
    return (
      <>
        <Typography
          variant="h6"
          fontSize={"1.15rem"}
          gutterBottom
          sx={{ mt: 2 }}
        >
          RateMyProfessor Statistics
        </Typography>
        <Box sx={{ px: 2 }}>
          <Typography variant="body2" display="inline" color="text.secondary">
            No data available.
            <Typography
              variant="body2"
              component={"span"}
              fontSize={"0.72rem"}
              marginLeft={"7px"}
              color="text.secondary"
            >
              <a
                href={getRmpLink()}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#802a25" }}
              >
                Search RateMyProfessors
              </a>
            </Typography>
          </Typography>
        </Box>
      </>
    );
  }
  return (
    <>
      <Typography variant="h6" fontSize={"1.15rem"} gutterBottom sx={{ mt: 2 } } >
          <a
            href={getRmpLink()}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#802a25" }}
          >
            RateMyProfessor Statistics
          </a>
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 4,
          justifyContent: "space-between",
          px: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 8.5 }}>
        <StatBox
            label="Quality"
            value={rmpData.avgRating}
            preferredPercentiles={preferredPercentiles}
            isRmpRating={true}
            // deptStats not used for RMP ratings
            deptStats={[]}
          />
          <StatBox
            label="Difficulty"
            value={rmpData.avgDifficulty}
            preferredPercentiles={preferredPercentiles}
            isRmpRating={true}
            // deptStats not used for RMP ratings
            deptStats={[]}
          />
        </Box>
      </Box>
    </>
  );
}
