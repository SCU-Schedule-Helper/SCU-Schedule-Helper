import { Fragment } from "react";
import { Card, CardContent, Typography, Stack, Divider, List, ListItem } from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import BookIcon from "@mui/icons-material/Book";
import { ParsedInterestedSection, ParsedCourseTaken } from "./types";

interface ParsedCourses {
  interested: ParsedInterestedSection[],
  taken: ParsedCourseTaken[]
}

interface Props {
  courses: ParsedCourses;
}

export default function CourseDetailsCard({
  courses = { interested: [], taken: [] }
}: Props) {
  return (
    <Card variant="outlined" sx={{ width: "100%", mt: 2 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          divider={<Divider orientation="vertical" flexItem />}
        >
          <Stack spacing={1} sx={{ flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                display: "flex",
                alignItems: "center",
                fontWeight: "bold",
              }}
            >
              <SchoolIcon sx={{ mr: 1, color: "#703331" }} />
              Interested Courses
            </Typography>
            {courses.interested.length > 0 ? (
              courses.interested.map((course, index) => (
                <Fragment key={index}>
                  <Stack>
                    <Typography variant="body2">
                      {(course.courseCode &&
                        `${course.courseCode} - ${course.courseName}`) ||
                        course.courseName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Prof. {course.professor} | {course.meetingPattern}
                    </Typography>
                  </Stack>
                  {index < courses.interested.length - 1 && <Divider />}
                </Fragment>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No interested courses
              </Typography>
            )}
          </Stack>

          <Stack spacing={1} sx={{ flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                display: "flex",
                alignItems: "center",
                fontWeight: "bold",
              }}
            >
              <BookIcon sx={{ mr: 1, color: "#703331" }} />
              Taken Courses
            </Typography>
            {courses.taken.length > 0 ? (
              courses.taken.map((course, index) => (
                <Fragment key={index}>
                  <Stack>
                    <Typography variant="body2">
                      {(course.courseCode &&
                        `${course.courseCode} - ${course.courseName}`) ||
                        course.courseName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(course.professor !== "Not taken at SCU" &&
                        `Prof. ${course.professor} | ${course.quarter}`) ||
                        "Not taken at SCU"}
                    </Typography>
                  </Stack>
                  {index < courses.taken.length - 1 && <Divider />}
                </Fragment>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No taken courses
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
