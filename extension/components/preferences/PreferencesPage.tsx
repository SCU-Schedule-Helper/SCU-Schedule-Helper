import { useState, useEffect, useRef, ChangeEvent } from "react";
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
import RangeSliderTime from "./RangeSliderTime";
import PercentSlider from "./PercentSlider";
import PreferencesDialog from "./PreferencesDialog";
import DifficultySlider from "./DifficultySlider";
import {
  UserPreferences,
  SectionTimeRangePreferences,
} from "../utils/types.js";

export default function PreferencesPage() {
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const shouldSendUpdate = useRef(false);

  useEffect(() => {
    checkUserPreferences();

    function storageListener(changes: { [key: string]: chrome.storage.StorageChange; }, namespace: string) {
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
    const message = {
      type: "updateUser",
      updateItems: {
        preferences: {
          ...userPrefs,
        },
      },
      allowLocalOnly: true,
    };
    chrome.runtime.sendMessage(message).then((response: { message: string; ok: boolean }) => {
      if (response && !response.ok) {
        setErrorMessage(response.message);
        setShowActionCompletedMessage(true);
      } else setErrorMessage(null);
    });
  }

  function toggleCourseTracking(event: ChangeEvent<HTMLInputElement>) {
    setUserPrefs(
      (prev) =>
        prev && {
          ...prev,
          courseTracking: event.target.checked,
        }
    );
    shouldSendUpdate.current = true;
  }

  function toggleShowRatings(event: ChangeEvent<HTMLInputElement>) {
    setUserPrefs(
      (prev) =>
        prev && {
          ...prev,
          showRatings: event.target.checked,
        }
    );
    shouldSendUpdate.current = true;
  }

  function handleDifficultyPreferenceChange(newValue: number) {
    setUserPrefs(
      (prev) =>
        prev && {
          ...prev,
          difficulty: newValue,
        }
    );
    shouldSendUpdate.current = true;
  }

  function handleTimePreferenceChange(newValue: SectionTimeRangePreferences) {
    setUserPrefs(
      (prev) =>
        prev && {
          ...prev,
          preferredSectionTimeRange: {
            ...newValue,
          },
        }
    );
    shouldSendUpdate.current = true;
  }

  function handlePercentagePreferenceChange(newValue: number[]) {
    setUserPrefs(
      (prev) =>
        prev && {
          ...prev,
          scoreWeighting: {
            scuEvals: newValue[0]!,
            rmp: 100 - newValue[0]!,
          },
        }
    );
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
        <Box sx={{ padding: 2 }}>
          <Stack direction="row" alignItems="center">
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
        </Box>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            padding: 0,
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
