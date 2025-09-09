import { SyntheticEvent, useEffect, useState } from "react";
import { Box, Slider, createTheme, ThemeProvider } from "@mui/material";

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
  initValue: number;
  onChangeCommitted: (_newValue: number) => void;
}

export default function DifficultySlider({
  initValue,
  onChangeCommitted,
}: Props) {
  const [sliderValue, setSliderValue] = useState(initValue);

  useEffect(() => {
    setSliderValue(initValue);
  }, [initValue]);

  function handleChange(_event: Event, newValue: number | number[]) {
    if (typeof newValue !== "number") {
      console.error("Invalid value type:", newValue);
      return;
    }
    setSliderValue(newValue);
  }

  function handleChangeCommitted(
    _event: SyntheticEvent | Event,
    newValue: number | number[]
  ) {
    if (typeof newValue !== "number") {
      console.error("Invalid value type:", newValue);
      return;
    }
    onChangeCommitted(newValue);
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: 300 }}>
        <Slider
          value={sliderValue}
          onChange={handleChange}
          onChangeCommitted={handleChangeCommitted}
          getAriaValueText={(_val) => ""}
          step={1}
          marks={[
            { value: 0, label: "Very easy" },
            { value: 1, label: "Easy" },
            { value: 2, label: "Average" },
            { value: 3, label: "Hard" },
            { value: 4, label: "Very hard" },
          ]}
          min={0}
          max={4}
          track={false}
          valueLabelDisplay="off"
        />
      </Box>
    </ThemeProvider>
  );
}
