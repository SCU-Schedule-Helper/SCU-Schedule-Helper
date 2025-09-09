import { Box, Card, CardContent, Typography } from "@mui/material";
import LinearWithValueLabel from "./LinearWithValueLabel";

interface Props {
  title: string;
  progressMessage: string;
  progressNumerator: number;
  progressDenominator: number;
}

export default function ProgressCard({
  title,
  progressMessage,
  progressNumerator,
  progressDenominator,
}: Props) {
  return (
    <Card
      variant="outlined"
      sx={{
        bgcolor: "#dedede", // Light gray background
        display: "flex",
        flexDirection: "column",
        height: "100%", // Ensure the card takes full height if needed
        padding: 0,
        width: "20rem",
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          fontWeight="bold"
          variant="h5"
          color="textPrimary"
          textAlign={"center"}
          gutterBottom
        >
          {title}
        </Typography>
        <Typography
          variant="h6"
          fontSize="1rem"
          marginBottom="0.3rem"
          color="textPrimary"
          textAlign={"center"}
        >
          Please do not scroll.
        </Typography>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" textAlign="center" color="text.primary">
            {progressMessage}
          </Typography>
        </Box>
      </CardContent>
      <Box
        sx={{
          width: "100%",
          marginTop: "auto",
        }}
      >
        <LinearWithValueLabel
          numerator={progressNumerator}
          denominator={progressDenominator}
        />
      </Box>
    </Card>
  );
}
