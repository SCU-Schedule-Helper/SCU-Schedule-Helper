import { MouseEvent, useState } from "react";
import {
  Box,
  TextField,
  Stack,
  Button,
  Typography,
  IconButton,
  Autocomplete,
} from "@mui/material";
import { Edit, Close } from "@mui/icons-material";
import { ParsedCourseTaken, ParsedInterestedSection } from "../utils/types";

interface Props {
  courseOptions: string[];
  professorOptions: string[];
  timeOptions: string[];
  course: ParsedCourseTaken | ParsedInterestedSection;
  onCourseChange: (
    type: string,
    oldKey: string,
    newKey: string
  ) => Promise<void>;
  onRemoveCourse: (
    event: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>,
    course: ParsedCourseTaken | ParsedInterestedSection
  ) => void;
}
export default function CourseBox({
  courseOptions,
  professorOptions,
  timeOptions,
  course,
  onCourseChange,
  onRemoveCourse,
}: Props) {
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editedCourseName, setEditedCourseName] = useState(course.courseName);
  const [editedProfessor, setEditedProfessor] = useState(course.professor);
  const [editedCourseTime, setEditedCourseTime] = useState<string | null>(null);

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

  function handleEditClick(
    e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>,
    course: ParsedCourseTaken | ParsedInterestedSection
  ) {
    e.preventDefault();
    setIsEditingCourse(true);
    setEditedCourseName(getCourseString());
    setEditedProfessor(course.professor);
    setEditedCourseTime(
      isParsedCourseTaken(course) ? course.quarter : course.meetingPattern
    );
  }

  function isParsedCourseTaken(
    course: ParsedCourseTaken | ParsedInterestedSection
  ): course is ParsedCourseTaken {
    return course.type === "taken";
  }

  function handleCancelEdit() {
    setIsEditingCourse(false);
  }

  async function handleSaveEdit() {
    const newKey =
      course.type === "interested"
        ? `P{${editedProfessor}}S{${editedCourseName}}M{${editedCourseTime}}`
        : `P{${editedProfessor}}C{${editedCourseName}}T{${editedCourseTime}}`;
    await onCourseChange(course.type, course.key!, newKey);
    setIsEditingCourse(false);
  }

  function getCourseString() {
    if (course.courseCode) return `${course.courseCode} - ${course.courseName}`;
    else return course.courseName;
  }

  return (
    <Box
      sx={{
        mb: 2,
        p: 2,
        borderRadius: 1,
        backgroundColor: "background.paper",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
        border: "1px solid #eee",
      }}
    >
      {isEditingCourse ? (
        <Box>
          <Autocomplete
            freeSolo
            options={courseOptions}
            value={editedCourseName}
            onInputChange={(event, newInputValue) =>
              setEditedCourseName(newInputValue)
            }
            onChange={(event, newValue) => setEditedCourseName(newValue!)}
            sx={{ mb: 1.5 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Course Name"
                variant="outlined"
                size="small"
                sx={textFieldSx}
              />
            )}
          />
          <Stack direction="row" spacing={1}>
            <Autocomplete
              freeSolo
              options={professorOptions}
              value={editedProfessor}
              onInputChange={(event, newInputValue) =>
                setEditedProfessor(newInputValue)
              }
              onChange={(event, newValue) => setEditedProfessor(newValue!)}
              sx={{ mb: 1.5, width: "50%" }}
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
              value={editedCourseTime}
              onInputChange={(event, newInputValue) =>
                setEditedCourseTime(newInputValue)
              }
              onChange={(event, newValue) => setEditedCourseTime(newValue)}
              sx={{ mb: 1.5, width: "50%" }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={
                    course.type === "interested" ? "Meeting Pattern" : "Quarter"
                  }
                  variant="outlined"
                  size="small"
                  sx={textFieldSx}
                />
              )}
            />
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            sx={{
              py: 1,
            }}
          >
            <Button
              size="small"
              onClick={handleCancelEdit}
              sx={{
                color: "#802a25",
                "&:hover": {
                  backgroundColor: "rgba(128, 42, 37, 0.1)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              onClick={handleSaveEdit}
              variant="contained"
              sx={{
                backgroundColor: "#802a25",
                color: "white",
                "&:hover": {
                  backgroundColor: "#671f1a",
                },
              }}
            >
              Save
            </Button>
          </Stack>
        </Box>
      ) : (
        <>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body1" sx={{ color: "#333" }}>
              {getCourseString()}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                pr: 2,
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => handleEditClick(e, course)}
                sx={{
                  color: "#802a25",
                  "&:hover": {
                    backgroundColor: "rgba(128, 42, 37, 0.1)",
                  },
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => onRemoveCourse(e, course)}
                sx={{
                  color: "error.main",
                  "&:hover": {
                    backgroundColor: "error.light",
                    color: "white",
                  },
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {isParsedCourseTaken(course)
              ? (course.professor === "Not taken at SCU" &&
                "Not taken at SCU") ||
              `Prof. ${course.professor} | ${course.quarter}`
              : `${course.professor} | ${course.meetingPattern}`}
          </Typography>
        </>
      )}
    </Box>
  );
}
