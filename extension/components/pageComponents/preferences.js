import { useState, useEffect, useRef } from "react";
import {
  Alert,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  IconButton,
  Stack,
  Snackbar,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import RangeSliderTime from "../prefComponents/RangeSliderTime";
import PercentSlider from "../prefComponents/PercentSlider";
import PreferencesDialog from "../prefComponents/PreferencesDialog";
import DifficultySlider from "../prefComponents/DifficultySlider";

export default function Preferences() {
  const [userPrefs, setUserPrefs] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const debounceTimerRef = useRef(null);
  const shouldSendUpdate = useRef(false);

  useEffect(() => {
    checkUserPreferences();

    function storageListener(changes, namespace) {
      if (namespace === "local" && changes.userInfo) {
        checkUserPreferences();
      }
    }
    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  useEffect(() => {
    if (!shouldSendUpdate.current) {
      return;
    }
    submitPreferences();
  }, [userPrefs]);

  async function checkUserPreferences() {
    try {
      const userInfo = (await chrome.storage.local.get("userInfo")).userInfo;
      setLoggedIn(!!userInfo.id);
      if (userInfo.preferences) {
        setUserPrefs(userInfo.preferences);
        shouldSendUpdate.current = false;
      } else {
        setUserPrefs({
          difficulty: 0,
          preferredSectionTimeRange: {
            startHour: 8,
            startMinute: 0,
            endHour: 20,
            endMinute: 0,
          },
          scoreWeighting: {
            scuEvals: 50,
            rmp: 50,
          },
          courseTracking: true,
          showRatings: true,
        });
      }
    } catch (error) {
      console.error("Error checking user preferences:", error);
    }
  }

  function submitPreferences() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const message = {
        type: "updateUser",
        updateItems: {
          preferences: {
            ...userPrefs,
          },
        },
        allowLocalOnly: true,
      };
      chrome.runtime.sendMessage(message).then((response) => {
        if (response && !response.ok) {
          setErrorMessage(response.message);
          setShowActionCompletedMessage(true);
        } else setErrorMessage(null);
      });
    }, 500);
  }

  function toggleCourseTracking(event) {
    setUserPrefs((prev) => ({
      ...prev,
      courseTracking: event.target.checked,
    }));
    shouldSendUpdate.current = true;
  }

  function toggleShowRatings(event) {
    setUserPrefs((prev) => ({
      ...prev,
      showRatings: event.target.checked,
    }));
    shouldSendUpdate.current = true;
  }

  function handleDifficultyPreferenceChange(newValue) {
    setUserPrefs((prev) => ({
      ...prev,
      difficulty: newValue,
    }));
    shouldSendUpdate.current = true;
  }

  function handleTimePreferenceChange(newValue) {
    setUserPrefs((prev) => ({
      ...prev,
      preferredSectionTimeRange: {
        ...newValue,
      },
    }));
    shouldSendUpdate.current = true;
  }

  function handlePercentagePreferenceChange(newValue) {
    setUserPrefs((prev) => ({
      ...prev,
      scoreWeighting: {
        scuEvals: newValue[0],
        rmp: 100 - newValue[0],
      },
    }));
    shouldSendUpdate.current = true;
  }

  function handleDialogOpen() {
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
  }

  return (
    userPrefs && (
      <>
        <Box sx={{ 
          padding: 2, 
          display: "flex",
          flexDirection: "column",
          gap: 2
        }}>
          <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ textAlign: "center" }}>
              Course Preferences
            </Typography>
            <IconButton
              sx={{
                ml: 0.5,
              }}
              onClick={handleDialogOpen}
              aria-label="info"
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
          <Typography textAlign="center">I want my classes to be...</Typography>
          <DifficultySlider
            initValue={userPrefs.difficulty}
            onChangeCommitted={handleDifficultyPreferenceChange}
          />

          <Typography textAlign="center">
            What are your preferred course times?
          </Typography>
          <RangeSliderTime
            initValue={userPrefs.preferredSectionTimeRange}
            onChangeCommitted={handleTimePreferenceChange}
          />

          {loggedIn && (
            <>
              <Typography textAlign="center">
                How should we balance RateMyProfessor and SCU Evaluations data?
              </Typography>
              <PercentSlider
                initValue={[userPrefs.scoreWeighting.scuEvals]}
                onChangeCommitted={handlePercentagePreferenceChange}
                sx={{ width: "90%" }}
              />
            </>
          )}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={userPrefs.showRatings}
                  onChange={toggleShowRatings}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: "#802a25",
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#802a25",
                    },
                    "& .MuiSwitch-switchBase": {
                      color: "#703331",
                    },
                    "& .MuiSwitch-track": {
                      backgroundColor: "#ccc",
                    },
                  }}
                />
              }
              label="Show ratings in Workday"
              sx={{
                display: "flex",
                justifyContent: "left",
                alignItems: "center",
                width: "100%",
              }}
            />
            {loggedIn && (
              <FormControlLabel
                control={
                  <Switch
                    checked={userPrefs.courseTracking}
                    onChange={toggleCourseTracking}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#802a25",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        {
                          backgroundColor: "#802a25",
                        },
                      "& .MuiSwitch-switchBase": {
                        color: "#703331",
                      },
                      "& .MuiSwitch-track": {
                        backgroundColor: "#ccc",
                      },
                    }}
                  />
                }
                label="Automatically keep track of my courses"
                sx={{
                  display: "flex",
                  justifyContent: "left",
                  alignItems: "center",
                  width: "100%",
                }}
              />
            )}
          </Box>
          </Box>
          <Snackbar
            open={showActionCompletedMessage}
            autoHideDuration={3000}
            onClose={() => setShowActionCompletedMessage(false)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={() => setShowActionCompletedMessage(false)}
              severity={"error"}
              sx={{ width: "100%" }}
            >
              {errorMessage}
            </Alert>
          </Snackbar>
        </Box>
        <PreferencesDialog open={dialogOpen} onClose={handleDialogClose} />
      </>
    )
  );
}
