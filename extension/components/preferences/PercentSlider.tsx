import { SyntheticEvent, useEffect, useState } from "react";
import { Box, Slider, createTheme, ThemeProvider } from "@mui/material";

function getValueText(value: number) {
  return `${100 - value}% RMP | ${value}% SCU Evals`;
}

const theme = createTheme({
  components: {
    MuiSlider: {
      styleOverrides: {
        root: {
          color: "#872f2a",
        },
        thumb: {
          backgroundColor: "#872f2a",
          "&:hover, &.Mui-active": {
            boxShadow: "0 0 0 8px rgba(135, 47, 42, 0.16)",
          },
        },
        track: {
          backgroundColor: "#872f2a",
        },
        rail: {
          backgroundColor: "#872f2a",
          opacity: 0.3,
        },
      },
    },
  },
});

interface Props {
  initValue: number[];
  onChangeCommitted: (newValue: number[]) => void;
}

export default function PercentSlider({ initValue, onChangeCommitted }: Props) {
  const [sliderValue, setSliderValue] = useState(initValue);

  useEffect(() => {
    setSliderValue(initValue);
  }, [initValue]);

  function handleChange(event: Event, newValue: number | number[]) {
    if (typeof newValue === "number") {
      console.error("Invalid value type:", newValue);
      return;
    }
    setSliderValue(newValue);
  }

  function handleChangeCommitted(
    event: SyntheticEvent | Event,
    newValue: number | number[]
  ) {
    if (typeof newValue === "number") {
      console.error("Invalid value type:", newValue);
      return;
    }
    onChangeCommitted(newValue);
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: 232 }}>
        <Slider
          value={sliderValue}
          onChange={handleChange}
          onChangeCommitted={handleChangeCommitted}
          getAriaValueText={getValueText}
          valueLabelFormat={getValueText}
          step={1}
          marks={[
            { value: 0, label: "Only RMP" },
            { value: 50, label: "Use both equally" },
            { value: 100, label: "Only SCU evals" },
          ]}
          min={0}
          max={100}
          valueLabelDisplay="auto"
        />
      </Box>
    </ThemeProvider>
  );
}
