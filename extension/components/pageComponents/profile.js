import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import AuthWrapper from "./authWrapper.js";
import ProfileSection from "../profileComponents/ProfileSection.js";
import CourseAccordion from "../profileComponents/CourseAccordion.js";
import FeedbackButton from "../profileComponents/FeedbackButton.js";
import ProfileDialog from "../profileComponents/ProfileDialog.js";

export default function Profile() {
  const [userInfo, setUserInfo] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openInfoDialog, setOpenInfoDialog] = useState(false); // Info dialog state
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);
  const [currentAction, setCurrentAction] = useState(null);

  useEffect(() => {
    function storageListener(changes, namespace) {
      if (namespace === "local" && changes.userInfo) {
        checkUserInfo();
      }
    }
    chrome.storage.onChanged.addListener(storageListener);
    checkUserInfo();
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  async function checkUserInfo() {
    try {
      const data = await chrome.storage.local.get("userInfo");
      setUserInfo(data.userInfo || null);
    } catch (error) {
      console.error("Error checking user info:", error);
      setUserInfo(null);
    }
  }

  async function signOut() {
    try {
      await chrome.runtime.sendMessage("signOut");
    } catch (error) {
      console.error("Error signing out:", error);
      handleActionCompleted(
        "An unknown error occurred while signing out.",
        "error",
      );
    }
  }

  async function deleteAccount() {
    try {
      const errorMessage = await chrome.runtime.sendMessage("deleteAccount");
      if (errorMessage) {
        handleActionCompleted(errorMessage, "error");
      } else {
        handleActionCompleted("Account deleted successfully.", "success");
      }
    } catch (error) {
      handleActionCompleted(
        "An unknown error occurred while deleting account. Please try again.",
        "error",
      );
    }
  }

  async function handleConfirmDeleteAccount() {
    await deleteAccount();
    setOpenDeleteDialog(false);
  }

  function handleActionCompleted(message, type) {
    setCurrentAction({
      message,
      type,
    });
    setShowActionCompletedMessage(true);
  }

  function handleOpenDeleteDialog() {
    setOpenDeleteDialog(true);
  }

  function handleCloseDeleteDialog() {
    setOpenDeleteDialog(false);
  }

  function handleOpenInfoDialog() {
    setOpenInfoDialog(true);
  }

  function handleCloseInfoDialog() {
    setOpenInfoDialog(false);
  }

  return (
    <AuthWrapper>
      <Box sx={{ 
        padding: 2, 
        boxSizing: "border-box", 
        display: "flex",
        flexDirection: "column"
      }}>
        <Stack sx={{ mb: 2 }} direction="row" alignItems="center">
          <Typography variant="h6" sx={{ textAlign: "center" }}>
            Your Profile
          </Typography>
          <IconButton
            sx={{
              ml: 1,
              p: 0,
            }}
            onClick={handleOpenInfoDialog}
            aria-label="info"
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Stack>

        <ProfileSection
          userInfo={userInfo}
          handleActionCompleted={handleActionCompleted}
        />

        <Box sx={{ mb: 3 }}>
          <CourseAccordion
            userInfo={userInfo}
            handleActionCompleted={handleActionCompleted}
          />
        </Box>

        <Stack spacing={2} sx={{ width: "100%" }}>
          <FeedbackButton handleActionCompleted={handleActionCompleted} />

          {/* TODO: add this once we have a support page or buy me a coffee thing. */}
          {/* <Button color="success" variant="contained">
            Support Us
          </Button> */}

          <Button
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
            onClick={signOut}
          >
            Sign Out
          </Button>

          <Button
            sx={{
              backgroundColor: "red",
              color: "white",
              "&:hover": {
                backgroundColor: "#ff4d4d",
              },
            }}
            onClick={handleOpenDeleteDialog}
          >
            Delete Account
          </Button>
        </Stack>

        <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to delete your account?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog} color="primary">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteAccount}
              color="error"
              autoFocus
            >
              Delete Account
            </Button>
          </DialogActions>
        </Dialog>
        <ProfileDialog
          openInfoDialog={openInfoDialog}
          handleCloseInfoDialog={handleCloseInfoDialog}
        />
        <Snackbar
          open={showActionCompletedMessage}
          autoHideDuration={3000}
          onClose={() => setShowActionCompletedMessage(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setShowActionCompletedMessage(false)}
            severity={currentAction?.type || "success"}
            sx={{ width: "100%" }}
          >
            {currentAction?.message}
          </Alert>
        </Snackbar>
      </Box>
    </AuthWrapper>
  );
}
