import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Button,
} from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PreferencesDialog({ open, onClose }: Props) {
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
          Preferred Difficulty
        </Typography>
        <Typography variant="body2" component={"p"}>
          Use the slider to select a preferred difficulty. Courses that are
          closer to your preferred difficulty will be colored green, and the
          overall score will be higher.
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Preferred Course Times
        </Typography>
        <Typography variant="body2" component={"p"}>
          Use the slider to select your preferred time range for classes.
          Courses outside your time range will be marked in Workday.
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          RateMyProfessor vs SCU Evaluations
        </Typography>
        <Typography variant="body2" component={"p"}>
          We use RateMyProfessor and SCU Course Evaluations data to calculate
          and display overall section scores inside Workday. Adjust the slider
          to change the weight of each data source in the overall score
          calculation.
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Show Ratings in Workday
        </Typography>
        <Typography variant="body2" component={"p"}>
          Enable this to show overall section scores in Workday, in the Find
          Course Sections page.
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Automatic Course Tracking
        </Typography>
        <Typography variant="body2" component={"p"}>
          Enable this to automatically add courses that you register for to your
          profile, as well as interested sections (i.e. when you add a course to
          a saved schedule). When disabled, you can still import your courses
          manually from the profile page. Your sensitive data is never stored.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
