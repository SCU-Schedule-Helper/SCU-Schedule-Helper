import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

interface Props {
  openInfoDialog: boolean;
  handleCloseInfoDialog: () => void;
}

export default function ProfileDialog({
  openInfoDialog,
  handleCloseInfoDialog,
}: Props) {
  return (
    <Dialog open={openInfoDialog}>
      <DialogTitle>More Information</DialogTitle>
      <DialogContent dividers>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Interested Courses
        </Typography>
        <Typography variant="body2" component={"p"}>
          Courses added to saved schedules will be added here, if you have
          automatic course tracking enabled. Otherwise, you can add them
          manually.
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Taken Courses
        </Typography>
        <Typography variant="body2" component={"p"}>
          Courses you've registered for will be added here, if you have
          automatic course tracking enabled. Otherwise, you can add them
          manually, or import them (see below).
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Import Current Courses
        </Typography>
        <Typography variant="body2" component={"p"}>
          Use this to automatically import your current courses (i.e. from this
          quarter only) from Workday into your profile. Your courses can only be
          seen by your friends.
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Import Course History
        </Typography>
        <Typography variant="body2" component={"p"}>
          Use this to automatically import your course history (including
          courses from before this quarter, but not courses from this quarter)
          from Workday. Note that we are only reading the course name and
          professor name when reading your course history--no sensitive data is
          ever stored on our servers.
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Support Us
        </Typography>
        <Typography variant="body2" component={"p"}>
          If you would like to see an AI powered course schedule generator
          feature, consider donating to support development of more features,
          and cloud computing costs.
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          marginTop={1}
          gutterBottom
        >
          Delete Account
        </Typography>
        <Typography variant="body2" component={"p"}>
          Permanently deletes your account and data. This action is permanent
          and cannot be undone. You can still create a new account after
          deleting your account.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseInfoDialog} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
