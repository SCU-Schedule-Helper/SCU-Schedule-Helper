import { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  TextField,
  Select,
  Stack,
} from "@mui/material";
import { SendAlertFunction } from "../utils/types";

interface Props {
  handleActionCompleted: SendAlertFunction;
}
export default function FeedbackButton({ handleActionCompleted }: Props) {
  const [open, setOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedFeedbackType, setSelectedFeedbackType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFeedbackText("");
    setSelectedFeedbackType("");
    setIsSubmitting(false);
  };

  async function handleSubmit() {
    if (!selectedFeedbackType || !feedbackText.trim()) {
      handleActionCompleted("Please fill in all required fields.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "submitFeedback",
        data: {
          feedbackType: selectedFeedbackType,
          feedbackText: feedbackText.trim(),
          source: "FeedbackForm",
        },
      });

      handleActionCompleted(
        response.message || "Something went wrong. Please try again later.",
        response.ok ? "success" : "error"
      );
      handleClose();
    } catch (error) {
      console.error("Unknown submission error:", error);
      handleActionCompleted(
        "Something went wrong. Please try again later.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const customStyles = {
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: "#ccc" },
      "&:hover fieldset": { borderColor: "#ccc" },
      "&.Mui-focused fieldset": { borderColor: "#703331" },
    },
    "& .MuiInputLabel-root": { color: "#ccc" },
    "& .Mui-focused.MuiInputLabel-root": { color: "#703331" },
  };

  return (
    <>
      <Button
        sx={{
          backgroundColor: "#802a25",
          color: "white",
          "&:hover": { backgroundColor: "#671f1a" },
        }}
        onClick={handleOpen}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit Feedback"}
      </Button>

      <Dialog
        open={open}
        onClose={!isSubmitting ? handleClose : undefined}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Submit Feedback</DialogTitle>
        <DialogContent sx={{ paddingBottom: 0 }}>
          <Stack spacing={2} marginTop={2}>
            <FormControl fullWidth sx={customStyles}>
              <InputLabel id="feedback-type-label">Feedback Type</InputLabel>
              <Select
                labelId="feedback-type-label"
                value={selectedFeedbackType}
                label="Feedback Type"
                onChange={(e) => setSelectedFeedbackType(e.target.value)}
                disabled={isSubmitting}
              >
                <MenuItem value={"General"}>General</MenuItem>
                <MenuItem value={"Feature Request"}>Feature Request</MenuItem>
                <MenuItem value={"Bug Report"}>Bug Report</MenuItem>
                <MenuItem value={"Other"}>Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              placeholder="Write your feedback here..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              sx={customStyles}
              disabled={isSubmitting}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              !selectedFeedbackType || !feedbackText.trim() || isSubmitting
            }
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": { backgroundColor: "#671f1a" },
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
