import { useState, useMemo, MouseEvent } from "react";
import {
  Typography,
  Box,
  IconButton,
  Button,
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from "@mui/material";
import { Add, Delete, Description, ImportContacts } from "@mui/icons-material";
import CourseBox from "./CourseBox";
import { getRelevantCourseTimes } from "../utils/user";
import { ParsedCourseTaken, ParsedInterestedSection, SendAlertFunction } from "../utils/types";

interface Props {
  courseOptions: string[];
  professorOptions: string[];
  handleActionCompleted: SendAlertFunction;
  handleAddCourse: (
    type: string,
    course: string,
    professor: string,
    courseTime: string
  ) => Promise<void>;
  handleEditCourse: (
    type: string,
    oldKey: string,
    newKey: string
  ) => Promise<void>;
  handleRemoveCourseClick: (
    event: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>,
    course: ParsedCourseTaken | ParsedInterestedSection
  ) => void;
  handleDeleteAllCoursesClick: (
    event: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>,
    type: string
  ) => void;
  title: string;
  courses: ParsedCourseTaken[] | ParsedInterestedSection[];
  type: "interested" | "taken";
}

export default function CourseAccordionSection({
  courseOptions,
  professorOptions,
  handleActionCompleted,
  handleAddCourse,
  handleEditCourse,
  handleRemoveCourseClick,
  handleDeleteAllCoursesClick,
  title,
  courses,
  type,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null as string | null);
  const [selectedProfessor, setSelectedProfessor] = useState(null as string | null);
  const [selectedCourseTime, setSelectedCourseTime] = useState(null as string | null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFunction, setImportFunction] = useState("");

  const timeOptions = useMemo(() => getRelevantCourseTimes(type), [type]);

  const textFieldSx = {
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
  };

  const handleAddClick = async (type: string) => {
    if (!selectedCourse || !selectedProfessor || !selectedCourseTime) {
      return;
    }
    await handleAddCourse(
      type === "interested" ? "interestedSections" : "coursesTaken",
      selectedCourse,
      selectedProfessor,
      selectedCourseTime
    );

    setSelectedCourse(null);
    setSelectedProfessor(null);
    setSelectedCourseTime(null);
    setExpanded(false);
  };

  const handleImportClick = (importFunction: string) => {
    setImportFunction(importFunction);
    setImportDialogOpen(true);
  };

  const handleImportConfirm = async () => {
    setImportDialogOpen(false);
    try {
      const errorMessage = await chrome.runtime.sendMessage(importFunction);
      if (errorMessage) {
        handleActionCompleted(errorMessage, "error");
      }
    } catch (error) {
      console.error("Error importing courses:", error);
      handleActionCompleted(
        "An unknown error occurred while importing courses.",
        "error"
      );
    }
  };

  const getDialogText = () => {
    const isCurrentCourses = importFunction === "importCurrentCourses";
    return {
      title: `Import ${isCurrentCourses ? "Current" : "Previous"} Courses`,
      content: `You will be redirected to the Workday course page to automatically import your ${
        isCurrentCourses ? "current" : "previous"
      } courses. Only course names, professor names, and course time information is stored.`,
    };
  };

  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography variant="h6">{title}</Typography>
        <Tooltip title="Add a course">
          <IconButton onClick={() => setExpanded(!expanded)} sx={{ ml: 1 }}>
            <Add />
          </IconButton>
        </Tooltip>
        {type === "taken" && (
          <>
            <Tooltip title="Import current courses from Workday">
              <IconButton
                onClick={() => handleImportClick("importCurrentCourses")}
                sx={{ ml: 1 }}
              >
                <ImportContacts />
              </IconButton>
            </Tooltip>
            <Tooltip title="Import all previous courses from Workday">
              <IconButton
                onClick={() => handleImportClick("importCourseHistory")}
                sx={{ ml: 1 }}
              >
                <Description />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title={`Delete all ${title.toLowerCase()}`}>
          <IconButton
            onClick={(e) => handleDeleteAllCoursesClick(e, type)}
            sx={{ ml: 1 }}
          >
            <Delete />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Import Confirmation Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        aria-labelledby="import-dialog-title"
        aria-describedby="import-dialog-description"
      >
        <DialogTitle id="import-dialog-title">
          {getDialogText().title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="import-dialog-description"
            sx={{ whiteSpace: "pre-line" }}
          >
            {getDialogText().content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setImportDialogOpen(false)}
            sx={{
              color: "#802a25",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImportConfirm}
            variant="contained"
            sx={{
              backgroundColor: "#802a25",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
          >
            Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {expanded && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <Autocomplete
            freeSolo
            options={courseOptions}
            value={selectedCourse}
            onInputChange={(_event, newInputValue) => {
              setSelectedCourse(newInputValue);
            }}
            onChange={(_event, newValue) => setSelectedCourse(newValue)}
            sx={{ mb: 2 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Course"
                variant="outlined"
                size="small"
                sx={textFieldSx}
              />
            )}
          />
          <Autocomplete
            freeSolo
            options={professorOptions}
            value={selectedProfessor}
            onInputChange={(_event, newInputValue) => {
              setSelectedProfessor(newInputValue);
            }}
            onChange={(_event, newValue) => setSelectedProfessor(newValue)}
            sx={{ mb: 2 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Professor"
                variant="outlined"
                size="small"
                sx={textFieldSx}
              />
            )}
          />
          <Autocomplete
            freeSolo
            options={timeOptions}
            value={selectedCourseTime}
            onInputChange={(_event, newInputValue) => {
              setSelectedCourseTime(newInputValue);
            }}
            onChange={(_event, newValue) => setSelectedCourseTime(newValue)}
            sx={{ mb: 2 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={type === "interested" ? "Meeting Pattern" : "Quarter"}
                variant="outlined"
                size="small"
                sx={textFieldSx}
              />
            )}
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => {
              handleAddClick(type);
            }}
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
          >
            Add Course
          </Button>
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            onClick={() => setExpanded(false)}
            sx={{
              mt: 1,
              backgroundColor: "white",
              color: "#802a25",
              borderColor: "#802a25",
              "&:hover": {
                backgroundColor: "rgba(128, 42, 37, 0.1)",
              },
            }}
          >
            Cancel
          </Button>
        </Box>
      )}
      {courses.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {courses.map((course, index) => (
            <CourseBox
              key={index}
              courseOptions={courseOptions}
              professorOptions={professorOptions}
              timeOptions={timeOptions}
              course={course}
              onCourseChange={handleEditCourse}
              onRemoveCourse={handleRemoveCourseClick}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
