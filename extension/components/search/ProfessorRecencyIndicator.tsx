import { Typography } from "@mui/material";
import {
    Check as CheckIcon,
    Warning as WarningIcon,
} from "@mui/icons-material";

interface ProfessorRecencyIndicatorProps {
  lastTaughtQuarter: string;
}

export default function ProfessorRecencyIndicator({ lastTaughtQuarter }: ProfessorRecencyIndicatorProps) {
    const indicator = getRecencyIndicator(lastTaughtQuarter);

    return (
        <Typography
            variant="body2"
            color="text.secondary"
            width={"150px"}
            sx={{ margin: "0px 0px 0x", display: "flex", alignItems: "center" }}
        >
            {indicator.icon}
            <Typography variant="body2" fontSize="0.8rem">
                {indicator.description}
            </Typography>
        </Typography>
    );
}

function getRecencyIndicator(lastTaughtQuarter: string) {
    const lastSeasonTaught = lastTaughtQuarter.split(" ")[0];
    const lastYearTaught = parseInt(lastTaughtQuarter.split(" ")[1]);
    const lastMonthTaught =
        lastSeasonTaught === "Winter"
            ? 3
            : lastSeasonTaught === "Spring"
                ? 6
                : lastSeasonTaught === "Summer"
                    ? 8
                    : 12;

    const lastDateTaught = new Date(`${lastYearTaught}-${lastMonthTaught}-01`);
    const currentQuarterDate = new Date();
    const msPerDay = 86400000;
    const daysSinceLastTaught =
        (currentQuarterDate.getTime() - lastDateTaught.getTime()) / msPerDay;

    if (daysSinceLastTaught <= 365) {
        return {
            description: "Taught Within 1yr",
            icon: (
                <CheckIcon
                    fontSize="small"
                    sx={{
                        marginRight: "2px",
                        color: "black",
                        marginBottom: "0px",
                        fontSize: "15px",
                    }}
                />
            ),
        };
    } else {
        return {
            description: `Last: ${lastSeasonTaught} ${lastYearTaught}`,
            icon: (
                <WarningIcon
                    fontSize="small"
                    sx={{
                        marginRight: "2px",
                        color: "black",
                        marginBottom: "0px",
                        fontSize: "15px",
                    }}
                />
            ),
        };
    }
}