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

export default function RatingSortingPicker({ sortingMetric, sortDescending, handleMetricChange }: Props) {
    return <Box
        sx={{
            display: "flex",
            justifyContent: "space-between",
            alignContent: "right",
            width: "16rem",
            paddingRight: "1.2rem",
            marginLeft: "auto",
            marginRight: "50px",
        }}
    >
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
                sx={{ 
                    cursor: "pointer", 
                    fontSize: "0.70rem",
                    flex: 1,
                    minWidth: "2.5rem",
                    maxWidth: "3.2rem",
                }}
                title={`Sort by ${metric}`}
            >
                <Box display="flex" flexDirection={"row"} alignItems={"center"} justifyContent="center">
                    <Box textAlign="center" sx={{ flex: 1 }}>
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
                        sx={{ marginLeft: "2px" }}
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
