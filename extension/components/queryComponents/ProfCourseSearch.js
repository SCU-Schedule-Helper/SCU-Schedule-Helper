import { useState, useMemo, useEffect } from "react";
import {
  Alert,
  Autocomplete,
  TextField,
  Box,
  Button,
  CircularProgress,
  Typography,
  Snackbar,
} from "@mui/material";
import { matchSorter } from "match-sorter";
import ProfCourseCard from "./ProfCourseCard";

export default function ProfCourseSearch({
  scrollToTop,
  query,
  onQueryChange,
}) {
  const [evalsData, setEvalsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkEvals();

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (
        namespace === "local" &&
        (changes.evals || changes.isDownloadingEvals)
      ) {
        if (
          changes.isDownloadingEvals &&
          changes.isDownloadingEvals.newValue === true
        )
          setIsLoading(true);
        else checkEvals();
      }
    });
  }, []);

  async function checkEvals() {
    try {
      setIsLoading(true);
      const data = await chrome.storage.local.get([
        "evals",
        "isDownloadingEvals",
      ]);
      if (data.evals) {
        setEvalsData(data.evals);
      }
      setIsLoading(data.isDownloadingEvals || false);
    } catch (ignore) {
      setIsLoading(false);
    }
  }

  async function retryDownload() {
    try {
      const errorMessage = await chrome.runtime.sendMessage("downloadEvals");
      if (errorMessage) onError(errorMessage);
    } catch (error) {
      console.error("Error retrying download:", error);
      onError("An unknown error occurred while retrying download.");
    }
  }

  function onError(message) {
    setError(message);
    setShowActionCompletedMessage(true);
  }

  const allOptions = useMemo(() => {
    if (!evalsData) return [];
    const options = [];
    try {
      if (evalsData === null) {
        console.error("Stored data is not a valid object", evalsData);
        return [];
      }

      Object.entries(evalsData).forEach(([key, value]) => {
        if (value?.type === "course") {
          if (!key.match(/([a-zA-Z]{0,5})(\d+[A-Z]*)/)) {
            console.error("Invalid course key:", key);
            return;
          }
          const [, dept, courseNum] = key.match(/([a-zA-Z]{0,5})(\d+[A-Z]*)/);

          options.push({
            id: key,
            label: `${dept} ${courseNum} - ${
              value.courseName || "Unnamed Course"
            }`,
            groupLabel: "Courses",
            type: "course",
            ...value,
          });
        } else if (value?.type === "prof") {
          options.push({
            id: key,
            label: key,
            groupLabel: "Professors",
            type: "prof",
            ...value,
          });
        }
      });
    } catch (err) {
      console.error("Error processing search options:", err);
    }

    return options;
  }, [evalsData]);

  const searchOptions = useMemo(() => {
    if (searchQuery.trim() === "") return [];
    return allOptions;
  }, [allOptions, searchQuery]);

  function filterOptions(options, { inputValue }) {
    return matchSorter(options, inputValue, { keys: ["label"] }).slice(0, 100);
  }

  function onPageNavigation(newPageKey) {
    onQueryChange((prev) => {
      const newPageData = evalsData[newPageKey];
      if (newPageData.type === "prof") {
        return {
          id: newPageKey,
          label: newPageKey,
          groupLabel: "Professors",
          type: "prof",
          ...newPageData,
        };
      } else {
        const [, dept, courseNum] = newPageKey.match(/([A-Z]{4})(\d+[A-Z]*)/);
        return {
          id: newPageKey,
          label: `${dept} ${courseNum} - ${
            newPageData.courseName || "Unnamed Course"
          }`,
          groupLabel: "Courses",
          type: "course",
          ...newPageData,
        };
      }
    });
    scrollToTop();
  }

  function handleSearchChange(event) {
    setSearchQuery(event.target.value);
  }

  if (!isLoading && (!evalsData || Object.keys(evalsData).length === 0)) {
    return (
      <Box sx={{ width: "100%", textAlign: "center", mt: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No course evaluation data available.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={retryDownload}
          sx={{ mt: 2 }}
        >
          Retry Data Download
        </Button>
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
            {error}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ mb: 2 }}>
        <Autocomplete
          options={searchOptions}
          filterOptions={filterOptions}
          autoHighlight={true}
          groupBy={(option) => option.groupLabel}
          value={query}
          loading={isLoading}
          onChange={(event, newValue) => {
            onQueryChange(newValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Enter professor or course name"
              variant="outlined"
              size="small"
              InputLabelProps={{ shrink: false }}
              slotProps={{
                input: {
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isLoading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#ccc",
                  },
                  "&:hover fieldset": {
                    borderColor: "#ccc",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#703331",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "#ccc",
                },
                "& .MuiInputLabel-outlined-root": {
                  "&.Mui-focused": {
                    color: "#703331",
                  },
                },
                "& .Mui-focused.MuiInputLabel-root": {
                  color: "#703331",
                },
              }}
              onChange={handleSearchChange}
            />
          )}
        />
      </Box>

      <ProfCourseCard
        selected={query}
        data={evalsData}
        onPageNavigation={onPageNavigation}
      />
    </Box>
  );
}
