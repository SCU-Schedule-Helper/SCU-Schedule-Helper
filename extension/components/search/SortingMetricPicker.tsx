import {
    Box,
    Typography,
} from "@mui/material";
import {
    KeyboardArrowDown,
    KeyboardArrowUp,
} from "@mui/icons-material";
import { SortingMetrics } from "./ProfCourseCard";
interface SortingMetricPickerProps {
  sortingMetric: string;
  sortDescending: boolean;
  handleMetricChange: (metric: string) => void;
}
export default function SortingMetricPicker({ sortingMetric, sortDescending, handleMetricChange }: SortingMetricPickerProps) {
    // Header row aligned to 4 equal columns (Overall + 3 metrics)
    return <Box
        sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) repeat(4, 90px)",
            alignItems: "center",
            width: "100%",
        }}
    >
        {/* empty first column to align over the label column */}
        <Box />
        {[
            {
                metric: SortingMetrics.overall,
                subLabel: "Rank",
            },
            {
                metric: SortingMetrics.quality,
                subLabel: "(1-5)",
            },
            {
                metric: SortingMetrics.difficulty,
                subLabel: "(1-5)",
            },
            {
                metric: SortingMetrics.workload,
                subLabel: "(hrs/week)",
            },
        ].map(({ metric, subLabel }, index) => (
            <Typography
                key={index}
                variant="body2"
                color="text.secondary"
                textAlign={"center"}
                onClick={() => handleMetricChange(metric)}
                sx={{ cursor: "pointer", fontSize: "0.70rem" }}
                title={`Sort by ${metric}`}
            >
                <Box display="flex" flexDirection={"row"} alignItems={"center"}>
                    <Box textAlign="center">
                        {sortingMetric === metric ? (
                            <u>
                                <b>{metric}</b>
                            </u>
                        ) : (
                            metric
                        )}
                        <br />
                        {sortingMetric === metric ? (
                            <u>
                                <b>{subLabel}</b>
                            </u>
                        ) : (
                            subLabel
                        )}
                    </Box>
                    <Box
                        display="flex"
                        flexDirection={"column"}
                        alignItems={"center"}
                        justifyContent={"space-around"}
                    >
                        {sortingMetric === metric && !sortDescending ? (
                            <KeyboardArrowUp
                                fontSize="small"
                                sx={{ marginBottom: "-5px", fontSize: "1rem" }}
                            />
                        ) : sortingMetric === metric ? (
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
        ))}
    </Box>
}
