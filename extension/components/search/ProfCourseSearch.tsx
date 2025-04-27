import { useState, useMemo, useEffect, ChangeEvent } from "react";
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
import ProfCourseCard, { SelectedProfOrCourse } from "./ProfCourseCard";
import { EvalsData, ProfessorData } from "../utils/types";

interface Props {
  scrollToTop: () => void;
  selectedProfessorOrCourse: SelectedProfOrCourse | null;
  onSelectionChange: (newValue: SelectedProfOrCourse) => void;
}

export default function ProfCourseSearch({
  scrollToTop,
  selectedProfessorOrCourse,
  onSelectionChange,
}: Props) {
  const [evalsData, setEvalsData] = useState(null as EvalsData | null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null as string | null);
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

  function onError(message: string) {
    setError(message);
    setShowActionCompletedMessage(true);
  }

  const allOptions = useMemo(() => {
    if (!evalsData) return [];
    const options = [] as any[];
    try {
      if (evalsData === null) {
        console.error("Stored data is not a valid object", evalsData);
        return [];
      }

      Object.entries(evalsData).forEach(([key, value]) => {
        if (value?.type === "course") {
          const regexMatch = key.match(/([a-zA-Z]{0,5})(\d+[A-Z]*)/);
          if (!regexMatch) {
            console.error("Invalid course key:", key);
            return;
          }
          const [, dept, courseNum] = regexMatch!;

          options.push({
            id: key,
            label: `${dept} ${courseNum} - ${
              value.courseName || "Unnamed Course"
            }`,
            groupLabel: "Courses",
            ...value,
          });
        } else if (value?.type === "prof") {
          options.push({
            id: key,
            label: key,
            groupLabel: "Professors",
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

  function filterOptions(options: any, { inputValue }: { inputValue: string }) {
    return matchSorter<any>(options, inputValue, { keys: ["label"] }).slice(
      0,
      100
    );
  }

  function isProfessorData(data: any): data is ProfessorData {
    return data?.type === "prof" || false;
  }

  function onPageNavigation(newPageKey: string) {
    if (!evalsData) return;
    const newPageData = evalsData[newPageKey];
    if (isProfessorData(newPageData)) {
      onSelectionChange({
        id: newPageKey,
        label: newPageKey,
        groupLabel: "Professors",
        ...newPageData,
      } as SelectedProfOrCourse);
    } else {
      const regexMatch = newPageKey.match(/([A-Z]{4})(\d+[A-Z]*)/);
      if (!regexMatch) {
        console.error("Invalid course key:", newPageKey);
        return null;
      }
      const [, dept, courseNum] = regexMatch!;
      onSelectionChange({
        id: newPageKey,
        label: `${dept} ${courseNum} - ${newPageData.courseName}`,
        groupLabel: "Courses",
        ...newPageData,
      } as SelectedProfOrCourse);
    }
    scrollToTop();
  }

  function handleSearchChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
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
          value={selectedProfessorOrCourse}
          loading={isLoading}
          onChange={(e, newValue) => {
            onSelectionChange(newValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Courses and Professors"
              variant="outlined"
              size="small"
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
        selected={selectedProfessorOrCourse}
        data={evalsData}
        onPageNavigation={onPageNavigation}
      />
    </Box>
  );
}
