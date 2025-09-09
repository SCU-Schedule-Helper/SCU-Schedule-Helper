import { useState, useEffect, useMemo, MouseEvent } from "react";
import {
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Divider
} from "@mui/material";
import { Edit, ExpandMore } from "@mui/icons-material";
import { parseInterestedSections, parseTakenCourses } from "../utils/user";
import CourseAccordionSection from "./CourseAccordionSection";
import {
  CourseData,
  EvalsData,
  ParsedCourseTaken,
  ParsedInterestedSection,
  SendAlertFunction,
  UserProfile,
} from "../utils/types";

interface Props {
  userInfo: UserProfile | null;
  handleActionCompleted: SendAlertFunction;
}

export default function CourseAccordion({
  userInfo,
  handleActionCompleted,
}: Props) {
  const [evalsData, setEvalsData] = useState<(null | EvalsData)>(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [coursesToRemove, setCoursesToRemove] = useState<(ParsedCourseTaken | ParsedInterestedSection)[]>([]);
  const [transformedCourses, setTransformedCourses] = useState<{
    interested: ParsedInterestedSection[];
    taken: ParsedCourseTaken[];
  }>({
    interested: [],
    taken: [],
  });

  /**
   * Type guard to check if a value is CourseData.
   */
  function isCourseData(value: unknown): value is CourseData {
    return value != null && (value as CourseData).type === "course";
  }

  const courseOptions = useMemo(() => {
    if (!evalsData) return [];
    return Object.entries(evalsData || {})
      .filter((pair): pair is [string, CourseData] => isCourseData(pair[1]))
      .map(
        ([key, value]) => `${key} - ${value.courseName || "Unnamed Course"}`
      );
  }, [evalsData]);

  const professorOptions = useMemo(() => {
    if (!evalsData) return [];
    return Object.entries(evalsData || {})
      .filter(([, value]) => value && value.type === "prof")
      .map(([key]) => key);
  }, [evalsData]);

  useEffect(() => {
    async function fetchEvalsData() {
      try {
        const { evals } = await chrome.storage.local.get("evals");
        if (evals) {
          setEvalsData(evals);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    fetchEvalsData();
  }, []);

  useEffect(() => {
    if (userInfo) {
      userInfo.coursesTaken = userInfo.coursesTaken || [];
      userInfo.interestedSections = userInfo.interestedSections || {};
      userInfo.coursesTaken = userInfo.coursesTaken.filter((course) => course);

      setTransformedCourses({
        interested: parseInterestedSections(
          userInfo.interestedSections || {},
          true
        ),
        taken: parseTakenCourses(userInfo.coursesTaken || [], true),
      });
    }
  }, [userInfo]);

  async function handleAddCourse(
    courseType: string,
    courseName: string,
    professor: string,
    courseTime: string
  ) {
    if (!courseName || !professor || !courseTime) {
      handleActionCompleted(
        "Please select a course, professor, and meeting time.",
        "error"
      );
      return;
    }
    try {
      let addObject;
      if (courseType === "interestedSections") {
        const expirationDate = daysFromNow(45);
        addObject = {
          [`P{${professor}}S{${courseName}}M{${courseTime}}`]: expirationDate,
        };
      } else {
        addObject = [`P{${professor}}C{${courseName}}T{${courseTime}}`];
      }

      const updatePayload = {
        type: "updateUser",
        updateItems: {
          [courseType]: {
            add: addObject,
          },
        },
      };

      const response = await chrome.runtime.sendMessage(updatePayload);
      if (response && !response.ok) {
        handleActionCompleted(
          response.message || "Failed to add course. Please try again later.",
          "error"
        );
      } else {
        handleActionCompleted("Course successfully added!", "success");
      }
    } catch (error) {
      console.error("Error adding course:", error);
      handleActionCompleted(
        "An unexpected error occurred while adding the course. Please try again later.",
        "error"
      );
    }
  }

  async function handleEditCourse(
    type: string,
    oldKey: string,
    newKey: string
  ) {
    try {
      const updateItems: Record<string, any> = {};
      if (type === "interested") {
        updateItems.interestedSections = {
          remove: [oldKey],
          add: {
            [newKey]: daysFromNow(45),
          },
        };
      } else {
        updateItems.coursesTaken = {
          remove: [oldKey],
          add: [newKey],
        };
      }

      const messagePayload = {
        type: "updateUser",
        updateItems,
      };

      const updateResponse = await chrome.runtime.sendMessage(messagePayload);
      if (updateResponse && !updateResponse.ok) {
        handleActionCompleted(updateResponse.message, "error");
      } else {
        handleActionCompleted("Course successfully updated!", "success");
      }
    } catch (error) {
      console.error("Error updating course:", error);
      handleActionCompleted(
        "An unexpected error occurred while updating the course. Please try again later.",
        "error"
      );
    }
  }

  function handleRemoveCourseClick(
    event: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>,
    course: ParsedCourseTaken | ParsedInterestedSection
  ) {
    event.stopPropagation();
    setCoursesToRemove([course]);
    setOpenConfirmDialog(true);
  }

  function handleDeleteAllCoursesClick(
    event: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>,
    type: string
  ) {
    event.stopPropagation();
    setOpenConfirmDialog(true);
    setCoursesToRemove(
      transformedCourses[type === "interested" ? "interested" : "taken"].filter(
        (course) => course.type === type
      )
    );
  }

  async function handleConfirmRemoveCourses() {
    if (coursesToRemove.length < 1) {
      setOpenConfirmDialog(false);
      handleActionCompleted("No courses to delete!", "error");
      return;
    }
    try {
      const updateItems: Record<string, any> = {};
      updateItems.interestedSections = {
        remove: coursesToRemove
          .filter((course) => course.type === "interested")
          .map((course) => course.key),
      };
      updateItems.coursesTaken = {
        remove: coursesToRemove
          .filter((course) => course.type === "taken")
          .map((course) => course.key),
      };

      const messagePayload = {
        type: "updateUser",
        updateItems,
      };

      const updateResponse = await chrome.runtime.sendMessage(messagePayload);
      setOpenConfirmDialog(false);
      if (updateResponse && !updateResponse.ok) {
        handleActionCompleted(updateResponse.message, "error");
      } else {
        handleActionCompleted(
          `Course${(coursesToRemove.length > 1 && "s") || ""
          } successfully removed!`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error removing course:", error);
      handleActionCompleted(
        "An unexpected error occurred while removing the course. Please try again later.",
        "error"
      );
    }
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Stack direction="column" spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Edit fontSize="small" />
              <Typography>Your Courses</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Courses can only be seen by your friends.
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box>
              <CourseAccordionSection
                courseOptions={courseOptions}
                professorOptions={professorOptions}
                handleActionCompleted={handleActionCompleted}
                handleAddCourse={handleAddCourse}
                handleEditCourse={handleEditCourse}
                handleRemoveCourseClick={handleRemoveCourseClick}
                handleDeleteAllCoursesClick={handleDeleteAllCoursesClick}
                title="Interested Courses"
                courses={transformedCourses.interested}
                type="interested"
              />
              {transformedCourses.interested.length === 0 && (
                <EmptyStateMessage type="interested" />
              )}
            </Box>

            <Divider sx={{ my: 2, bgcolor: "grey.200" }} />

            <Box>
              <CourseAccordionSection
                courseOptions={courseOptions}
                professorOptions={professorOptions}
                handleActionCompleted={handleActionCompleted}
                handleAddCourse={handleAddCourse}
                handleEditCourse={handleEditCourse}
                handleRemoveCourseClick={handleRemoveCourseClick}
                handleDeleteAllCoursesClick={handleDeleteAllCoursesClick}
                title="Taken Courses"
                courses={transformedCourses.taken}
                type="taken"
              />
              {transformedCourses.taken.length === 0 && (
                <EmptyStateMessage type="taken" />
              )}
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Dialog
        open={openConfirmDialog}
        onClose={() => {
          setOpenConfirmDialog(false);
        }}
        aria-labelledby="remove-course-dialog-title"
        aria-describedby="remove-course-dialog-description"
      >
        <DialogTitle id="remove-course-dialog-title">
          {coursesToRemove.length === 1 ? "Remove Course" : "Remove Courses"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="remove-course-dialog-description">
            {coursesToRemove.length === 1
              ? "Are you sure you want to remove this course?"
              : "Are you sure you want to remove these courses?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenConfirmDialog(false);
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRemoveCourses}
            color="error"
            variant="contained"
            autoFocus
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function EmptyStateMessage({ type }: { type: "interested" | "taken" }) {
  return (
    <Typography
      variant="body2"
      sx={{
        color: "text.secondary",
        fontStyle: "italic",
        my: 2,
        textAlign: "center",
      }}
    >
      {type === "interested"
        ? "If automatic course tracking is enabled, courses added to saved schedules in Workday will show up here. Or, add interested sections manually."
        : "Use the buttons above to import courses from Workday, or add courses manually."}
    </Typography>
  );
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
