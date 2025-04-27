import { Box, Typography } from "@mui/material";

import React from "react";
interface StatBoxWithLessFormattingProps {
  label: string;
  value: number;
  preferredPercentiles: Record<string, number>;
  deptStats: number[];
  isRmpRating: boolean;
}
export default function StatBoxWithLessFormatting({
  label,
  value,
  preferredPercentiles,
  deptStats,
  isRmpRating,
}: StatBoxWithLessFormattingProps) {
  label = label.toLowerCase();
  
  function getColor(value: number, label: string, isRmpRating: boolean) {
    if (isRmpRating) {
      if (label === "quality") return getRatingColor(value, 1, 5, true);
      const diffScore = Math.abs(
        preferredPercentiles.difficulty * 4 - value + 1,
      );
      return getRatingColor(diffScore, 0, 4, false);
    }
    // Assume deptStats always contains data; assert non-null
    let percentile = getPercentile(value, deptStats)!;
    let score = 100 - Math.abs(preferredPercentiles[label] - percentile) * 100;
    return getRatingColor(score, 0, 100, true);
  }

  return (
    <Box sx={{ display: "flex", alignItems: "baseline" }}>
      <Typography
        variant="h6"
        sx={{
          color: getColor(value, label, isRmpRating),
          fontWeight: "bold",
          ...(label === "workload" ? { minWidth: "2.5rem", textAlign: "center" } : {}),
        }}
      >
        {value.toFixed(1)}
      </Typography>
    </Box>
  );
}

function getRatingColor(
  rating: number | null | undefined,
  ratingMin: number,
  ratingMax: number,
  goodValuesAreHigher: boolean
) {
  if (nullOrUndefined(rating)) return "rgba(0, 0, 0, 0.5)";
  if (rating < ratingMin) rating = ratingMin;
  if (rating > ratingMax) rating = ratingMax;
  const greenShade = [66, 134, 67];
  const yellowShade = [255, 165, 0];
  const redShade = [194, 59, 34];
  const ratingMid = ratingMin + (ratingMax - ratingMin) / 2;
  if (rating <= ratingMid && goodValuesAreHigher) {
    return interpolateColor(
      redShade,
      yellowShade,
      (rating - ratingMin) / (ratingMid - ratingMin),
    );
  }
  if (rating <= ratingMid && !goodValuesAreHigher) {
    return interpolateColor(
      greenShade,
      yellowShade,
      (rating - ratingMin) / (ratingMid - ratingMin),
    );
  }
  if (goodValuesAreHigher) {
    return interpolateColor(
      yellowShade,
      greenShade,
      (rating - ratingMid) / (ratingMax - ratingMid),
    );
  }
  return interpolateColor(
    yellowShade,
    redShade,
    (rating - ratingMid) / (ratingMax - ratingMid),
  );
}

function interpolateColor(color1: number[], color2: number[], ratio: number): string {
  const r = Math.round(color1[0] + ratio * (color2[0] - color1[0]));
  const g = Math.round(color1[1] + ratio * (color2[1] - color1[1]));
  const b = Math.round(color1[2] + ratio * (color2[2] - color1[2]));
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

function getPercentile(value: number, array: number[]): number | null {
  if (array.length === 0) return null;
  return bsFind(array, value) / array.length;
}

function bsFind(sortedArray: number[], target: number): number {
  let left = 0;
  let right = sortedArray.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (sortedArray[mid] === target) return mid;
    if (sortedArray[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return left;
}

function nullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}
