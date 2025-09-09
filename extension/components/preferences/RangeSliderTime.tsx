import { SyntheticEvent, useEffect, useState } from "react";
import { Box, Slider, createTheme, ThemeProvider } from "@mui/material";
import { SectionTimeRangePreferences } from "../../public/utils/types";

function generateMarks(startHour: number, endHour: number) {
  const marks = [];
  // Generate marks for every 15 minutes
  for (let i = 0; i <= (endHour - startHour) * 4; i++) {
    if (i % 8 !== 0) {
      marks.push({ value: i, label: "" });
      continue;
    }
    const hour = Math.floor(i / 4) + startHour;
    const minute = (i % 4) * 15;
    const amPmLabel = hour >= 12 ? "pm" : "am";
    const hourLabel = hour > 12 ? hour - 12 : hour;
    marks.push({
      value: i,
      label: `${hourLabel}:${minute.toString().padStart(2, "0")}${amPmLabel}`,
    });
  }
  return marks;
}

function getValueText(value: number) {
  const hour = Math.floor(value / 4) + 6;
  const minute = (value % 4) * 15;
  const amPmLabel = hour >= 12 ? "pm" : "am";
  const hourLabel = hour > 12 ? hour - 12 : hour;
  return `${hourLabel}:${minute.toString().padStart(2, "0")}${amPmLabel}`;
}

function getSectionTimeRange(value: number[]) {
  const startHour = Math.floor(value[0]! / 4) + 6;
  const startMinute = (value[0]! % 4) * 15;
  const endHour = Math.floor(value[1]! / 4) + 6;
  const endMinute = (value[1]! % 4) * 15;
  return { startHour, startMinute, endHour, endMinute };
}

function getValuesFromTimeRange(timeRange: SectionTimeRangePreferences) {
  const startValue = (timeRange.startHour - 6) * 4 + timeRange.startMinute / 15;
  const endValue = (timeRange.endHour - 6) * 4 + timeRange.endMinute / 15;
  return [startValue, endValue];
}

const theme = createTheme({
  components: {
    MuiSlider: {
      styleOverrides: {
        root: {
          color: "#802a25", // Updated to #802a25
        },
        thumb: {
          backgroundColor: "#802a25", // Updated to #802a25
          "&:hover, &.Mui-active": {
            boxShadow: "0 0 0 8px rgba(128, 42, 37, 0.16)", // Slightly lighter for hover effect
          },
        },
        track: {
          backgroundColor: "#802a25", // Updated to #802a25
        },
        rail: {
          backgroundColor: "#802a25", // Updated to #802a25
          opacity: 0.3,
        },
      },
    },
  },
});

interface Props {
  initValue: SectionTimeRangePreferences;
  onChangeCommitted: (_newValue: SectionTimeRangePreferences) => void;
}

export default function RangeSliderTime({
  initValue,
  onChangeCommitted,
}: Props) {
  const minHour = 6;
  const maxHour = 22;
  const [value, setValue] = useState(getValuesFromTimeRange(initValue));

  useEffect(() => {
    setValue(getValuesFromTimeRange(initValue));
  }, [initValue]);

  function handleChange(_event: Event, newValue: number | number[]) {
    if (typeof newValue === "number") {
      console.error("Unexpected value type:", newValue);
      return;
    }
    setValue(newValue);
  }

  function handleChangeCommitted(
    _event: SyntheticEvent | Event,
    newValue: number | number[]
  ) {
    if (typeof newValue === "number") {
      console.error("Unexpected value type:", newValue);
      return;
    }
    onChangeCommitted(getSectionTimeRange(newValue));
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: 300 }}>
        <Slider
          value={value}
          onChange={handleChange}
          onChangeCommitted={handleChangeCommitted}
          valueLabelDisplay="auto"
          valueLabelFormat={getValueText}
          getAriaValueText={getValueText}
          step={1}
          min={0}
          max={(maxHour - minHour) * 4}
          marks={generateMarks(minHour, maxHour).map((mark) => ({
            ...mark,
            label: <span style={{ fontSize: "0.55rem" }}>{mark.label}</span>,
          }))}
        />
      </Box>
    </ThemeProvider>
  );
}
