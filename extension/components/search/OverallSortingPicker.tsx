import {
    Box,
    Typography,
} from "@mui/material";
import {
    KeyboardArrowDown,
    KeyboardArrowUp,
} from "@mui/icons-material";
import { SortingMetrics } from "./ProfCourseCard";

interface Props {
  sortingMetric: string;
  sortDescending: boolean;
  handleMetricChange: (metric: string) => void;
}

export default function OverallSortingPicker({ sortingMetric, sortDescending, handleMetricChange }: Props) {
    return <Box
        sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
        }}
    >
        <Typography
            variant="body2"
            color="text.secondary"
            textAlign={"center"}
            onClick={() => handleMetricChange(SortingMetrics.overall)}
            sx={{ cursor: "pointer", fontSize: "0.70rem" }}
            title={`Sort by ${SortingMetrics.overall}`}
        >
            <Box display="flex" flexDirection={"row"} alignItems={"center"}>
                <Box textAlign="center">
                    {sortingMetric === SortingMetrics.overall ? (
                        <u>
                            <b>{SortingMetrics.overall}</b>
                        </u>
                    ) : (
                        SortingMetrics.overall
                    )}
                    <br />
                    {sortingMetric === SortingMetrics.overall ? (
                        <u>
                            <b>Rank</b>
                        </u>
                    ) : (
                        "Rank"
                    )}
                </Box>
                <Box
                    display="flex"
                    flexDirection={"column"}
                    alignItems={"center"}
                    justifyContent={"space-around"}
                >
                    {sortingMetric === SortingMetrics.overall && !sortDescending ? (
                        <KeyboardArrowUp
                            fontSize="small"
                            sx={{ marginBottom: "-5px", fontSize: "1rem" }}
                        />
                    ) : sortingMetric === SortingMetrics.overall ? (
                        <KeyboardArrowDown
                            fontSize="small"
                            sx={{ marginTop: "-5px", fontSize: "1rem" }}
                        />
                    ) : (
                        <>
                            <KeyboardArrowUp
                                fontSize="small"
                                sx={{ marginBottom: "-5px", fontSize: "1rem" }}
                            />
                            <KeyboardArrowDown
                                fontSize="small"
                                sx={{ marginTop: "-5px", fontSize: "1rem" }}
                            />
                        </>
                    )}
                </Box>
            </Box>
        </Typography>
    </Box>
}
