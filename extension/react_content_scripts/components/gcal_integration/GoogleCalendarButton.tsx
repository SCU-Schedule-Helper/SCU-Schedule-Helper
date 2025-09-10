import { Dispatch, SetStateAction, useState } from "react";
import { RRule, Weekday } from "rrule";
import { getEnrolledCoursesTables } from "../shared/utils";
import { Modal, Box, Typography, IconButton } from "@mui/material";
import Close from "@mui/icons-material/Close";

interface CourseEvent {
  courseName: string;
  location: string;
  professor: string;
  startDate: string;
  endDate: string;
  recurrence: string;
}

const WORKDAY_TO_RRULE_DAY_MAPPING: Record<string, Weekday> = {
  M: RRule.MO,
  T: RRule.TU,
  W: RRule.WE,
  Th: RRule.TH,
  F: RRule.FR,
};

const MEETING_PATTERN_REGEX =
  /(.*) \| (\d{1,2}:\d{1,2} (?:AM|PM)) - (\d{1,2}:\d{1,2} (?:AM|PM)) \| (.*)/;
const DAYS_OF_WEEK_STRINGS = ["Su", "M", "T", "W", "Th", "F", "Sa"];

export default function GoogleCalendarButton({ panel }: { panel: Element }) {
  const [status, setStatus] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const workdayButtonStyle = {
    padding: "10px 20px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    outline: "none",
    backgroundColor: isHovered ? "#333" : "white",
    color: isHovered ? "white" : "#333",
    border: "1px solid hsla(0, 0%, 20%, 1)",
    boxShadow: "0 0 1px hsla(0, 0%, 20%, 1) inset",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const handleClick = async () => {
    try {
      setIsModalOpen(true);
      setStatus("Checking for courses...");
      const courses = getRelevantCourses(panel, setErrors);
      if (!courses || !courses.length) {
        setStatus("No courses found.");
        return;
      }

      setStatus("Signing in to Google...");
      const token = await chrome.runtime.sendMessage("runCalendarOAuth");
      if (!token) {
        setErrors(["Sign-in failed. Please try again."]);
        return;
      }

      setStatus("Adding courses to Google Calendar...");
      await addCoursesToGoogleCalendar(token, courses, setErrors);

      setStatus("Courses successfully added!");
    } catch (error) {
      console.error("Error in Google Calendar integration:", error);
      setErrors(["An unknown error occurred. Please try again."]);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setStatus("");
    setErrors([]);
  };

  return (
    <div>
      <button
        style={workdayButtonStyle}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={chrome.runtime.getURL("images/icon-16.png")}
          style={{ position: "relative", top: "-1px" }}
        />
        Add Courses to Google Calendar
      </button>
      <Modal open={isModalOpen} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: "8px",
          }}
        >
          <IconButton
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            <Close onClick={handleCloseModal} />
          </IconButton>
          <Typography variant="h6" component="h2">
            Add Courses to Google Calendar
          </Typography>
          <Typography sx={{ mt: 2 }}>{status}</Typography>
          {errors && (
            <Typography sx={{ mt: 2, color: "red" }}>
              {errors.map((err, index) => (
                <div key={index}>{err}</div>
              ))}
            </Typography>
          )}
        </Box>
      </Modal>
    </div>
  );
}

function findHeaderIndex(
  headerCells: HTMLTableCellElement[],
  headerText: string
): number {
  const enrolledSectionsHeaderIndex = headerCells.findIndex(
    (header) => header.innerText.includes("Enrolled Sections")
  );

  const actualIndex = headerCells.findIndex(
    (header) => header.innerText.includes(headerText)
  );
  if (actualIndex > enrolledSectionsHeaderIndex)
    return actualIndex - 1;
  return actualIndex;
}

function getRelevantCourses(
  panel: Element,
  setErrors: Dispatch<SetStateAction<string[]>>
): CourseEvent[] {
  const tables = getEnrolledCoursesTables(panel);
  const courses: CourseEvent[] = [];
  for (const table of tables) {
    const rows = Array.from(
      table.querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>
    );
    const headerCells = Array.from(
      table.querySelectorAll("thead > tr > th") as NodeListOf<HTMLTableCellElement>
    );
    const courseNameHeaderIndex = findHeaderIndex(headerCells, "Course Listing");
    const meetingPatternHeaderIndex = findHeaderIndex(headerCells, "Meeting Patterns");
    const professorHeaderIndex = findHeaderIndex(headerCells, "Instructor");
    const startDateHeaderIndex = findHeaderIndex(headerCells, "Start Date");
    const endDateHeaderIndex = findHeaderIndex(headerCells, "End Date");

    if (courseNameHeaderIndex < 0 || meetingPatternHeaderIndex < 0 ||
      professorHeaderIndex < 0 || startDateHeaderIndex < 0 ||
      endDateHeaderIndex < 0) {
      console.error("Error: Could not find all required headers in the table.");
      return courses;
    }

    for (const row of rows) {
      const tds = row.querySelectorAll("td");
      const courseName = tds[courseNameHeaderIndex].innerText.trim();
      const meetingPattern = tds[meetingPatternHeaderIndex].innerText.trim();
      const professor = tds[professorHeaderIndex].innerText.trim();
      const startDateMMDDYYYY = tds[startDateHeaderIndex].innerText.trim();
      const endDateMMDDYYYY = tds[endDateHeaderIndex].innerText.trim();

      const meetingPatternRegexMatch = meetingPattern.match(
        MEETING_PATTERN_REGEX
      );

      if (!meetingPatternRegexMatch) {
        console.error(
          `Error: Could not parse meeting pattern: ${meetingPattern}`
        );
        setErrors((prev) => [
          ...prev,
          `Could not parse meeting pattern of ${courseName}`,
        ]);
        continue;
      }

      const courseDaysOfWeek = meetingPatternRegexMatch[1]
        .split(" ")
        .map((day) => day.trim());
      const startTime = meetingPatternRegexMatch[2].trim();
      const startDate = new Date(makeIsoString(startDateMMDDYYYY, startTime));
      startDate.setDate(
        startDate.getDate() + calcStartDateOffset(startDate, courseDaysOfWeek)
      );
      const endTime = meetingPatternRegexMatch[3].trim();
      const endDate = new Date(makeIsoString(startDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Los_Angeles'
      }), endTime));

      const actualCourseEndDate = getSundayBeforeDate(
        new Date(makeIsoString(endDateMMDDYYYY, endTime))
      );
      const recurrence = createRecurringEvent(
        courseDaysOfWeek,
        actualCourseEndDate
      );

      const location = meetingPatternRegexMatch[4].trim();

      courses.push({
        courseName,
        location,
        professor,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        recurrence,
      });
    }
  }
  return courses;
}

function makeIsoString(
  startDateMMDDYYYY: string,
  startTime: string,
  offset: string = getTimezoneOffsetString("America/Los_Angeles")
): string {
  const [month, day, year] = startDateMMDDYYYY.split("/").map((n) =>
    n.padStart(2, "0")
  );

  let [hourStr, minuteStr] = startTime.split(":");
  let hour = parseInt(hourStr, 10);
  const minutePart = minuteStr.slice(0, 2); // ignore AM/PM if present
  const ampm = minuteStr.slice(2).trim().toUpperCase(); // "AM" or "PM" if present

  // Convert 12-hour to 24-hour
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  const hourPadded = String(hour).padStart(2, "0");
  const minutePadded = minutePart.padStart(2, "0");
  const theDate = `${year}-${month}-${day}T${hourPadded}:${minutePadded}:00.000${offset}`;
  console.log("theDate", theDate);
  return theDate;
}

function getTimezoneOffsetString(timeZone: string, date = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = dtf.formatToParts(date);
  const dt = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  parts.forEach(({ type, value }) => { dt[type] = value });

  const targetTime = Date.UTC(
    dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second
  );

  const localTime = date.getTime();
  const offsetMinutes = (targetTime - localTime) / (60 * 1000);

  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const minutes = String(Math.floor(absOffset % 60)).padStart(2, '0');

  return `${sign}${hours}:${minutes}`;
}

async function addCoursesToGoogleCalendar(
  token: string,
  courses: CourseEvent[],
  setErrors: React.Dispatch<React.SetStateAction<string[]>>
) {
  const calendarId = "primary";
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId
  )}/events`;

  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  await Promise.all(
    courses.map(async (course) => {
      const event = {
        summary: course.courseName,
        location: course.location,
        description: `Professor: ${course.professor}`,
        start: {
          dateTime: `${course.startDate}`,
          timeZone: "America/Los_Angeles",
        },
        end: {
          dateTime: `${course.endDate}`,
          timeZone: "America/Los_Angeles",
        },
        recurrence: [course.recurrence],
      };

      if (await doesEventExist(token, course)) {
        return;
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(event),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Error adding event to Google Calendar: ${response.status} ${errorText}`
          );
          setErrors((prev) => [
            ...prev,
            `Failed to add ${course.courseName} to Google Calendar. Please try again.`,
          ]);
        }
      } catch (error) {
        console.error("Error adding event to Google Calendar:", error);
        setErrors((prev) => [
          ...prev,
          `Failed to add ${course.courseName} to Google Calendar. Please try again.`,
        ]);
      }
    })
  );
}

async function doesEventExist(token: string, event: CourseEvent) {
  const timeMin = new Date(event.startDate).toISOString();
  const timeMax = new Date(event.endDate).toISOString();

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );

  url.searchParams.set("q", event.courseName);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error checking for existing events:", error);
    return false;
  }
}

function createRecurringEvent(daysOfWeek: string[], until: Date): string {
  const byweekday = daysOfWeek
    .map((day) => WORKDAY_TO_RRULE_DAY_MAPPING[day])
    .filter(Boolean);

  if (byweekday.length === 0) {
    throw new Error("Invalid days of the week provided.");
  }

  const rule = new RRule({
    freq: RRule.WEEKLY,
    byweekday,
    until,
  });

  return rule.toString();
}

function calcStartDateOffset(startTimeDate: Date, courseDaysOfWeek: string[]) {
  const startDayOfWeekIndex = getDayIndexInTimeZone(startTimeDate, "America/Los_Angeles");
  const firstDayOfWeek = courseDaysOfWeek[0];
  const firstDayOfWeekIndex = DAYS_OF_WEEK_STRINGS.indexOf(firstDayOfWeek);
  let daysUntilFirstClass = firstDayOfWeekIndex - startDayOfWeekIndex;
  if (firstDayOfWeekIndex < startDayOfWeekIndex) {
    daysUntilFirstClass += 7;
  }
  return daysUntilFirstClass;
}

function getSundayBeforeDate(date: Date): Date {
  const sundayDate = new Date(date);
  const dayOfWeek = getDayIndexInTimeZone(sundayDate, "America/Los_Angeles");
  const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek;
  sundayDate.setDate(getDayOfMonthInTimeZone(sundayDate, "America/Los_Angeles") - daysToSubtract);
  return sundayDate;
}

function getDayIndexInTimeZone(date: Date, timeZone: string) {
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(date);

  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekdayStr];
}

function getDayOfMonthInTimeZone(date: Date, timeZone: string) {
  const dayStr = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    timeZone,
  }).format(date);
  return parseInt(dayStr, 10);
}
