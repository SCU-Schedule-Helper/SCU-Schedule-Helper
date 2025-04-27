import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Button,
} from "@mui/material";

interface QueryDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function QueryDialog({ open, onClose }: QueryDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>More Information</DialogTitle>
      <DialogContent dividers>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Rating Colors
        </Typography>
        <Typography variant="body2" component={"p"}>
          For RateMyProfessor ratings, the color of the rating is based simply
          on the magnitude of the rating. For example, a 5.0 quality rating will
          be the darkest green, while a 1.0 quality rating will be the darkest
          red. If your difficulty preference is set, the color for difficulty
          will be adjusted accordingly (very easy means you want a score of one
          ideally, easy means you want two, etc).
          <br />
          <br />
          For SCU Course Evaluations, the color of the rating is based on the
          percentile of the rating. For example, a 50th percentile (median)
          quality rating will always be yellow, while a 100th percentile (max)
          quality rating will always be the darkest green, no matter the
          magnitude. If your difficulty preference is set, the color for
          difficulty will be adjusted accordingly (very easy means you ideally
          want 0th percentile, easy means 25th percentile, etc). The percentiles
          are relative to the cumulative data for all classes in that department
          (e.g. CSCI or FNCE). Thus, what may be a dark green rating in one
          department could be a yellow rating in another.
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Scoring Algorithm
        </Typography>
        <Typography variant="body2" component={"p"}>
          The overall scores shown within Workday are calculated using a simple
          scoring algorithm, which is similar to how the colors are calculated.
          <br />
          <br />
          For RateMyProfessor, the score is calculated as the sum of the quality
          and (5 - |difficulty - userDifficultyPreference|).
          <br />
          <br />
          For SCU evaluations, the score is calculated using the percentiles of
          each rating category (quality, difficulty, workload, etc). Changing
          your difficulty preference will change the ideal percentile for the
          difficulty and workload ratings. The overall score is then calculated
          by taking a weighted average of the two scores, with the weights
          determined by your preferences (the RMP vs SCU evaluations percentage
          slider).
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Usage Concerns
        </Typography>
        <Typography variant="body2" component={"p"}>
          In order to avoid having your connection throttled by RateMyProfessor,
          we recommend that you do not use the extension to view massive amounts
          of professor information in a short period of time. We have noticed
          that you may incur a temporary request limit if you do this. If it
          does happen, don't worry, its not permanent. Use at your own risk.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
