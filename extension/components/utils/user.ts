import { ParsedInterestedSection, ParsedCourseTaken } from "./types";

/**
 *
 * @param {*} interestedSections An object of interested sections from the userInfo object in Chrome storage.
 * @returns An array of interested section objects, that can be used for the interested courses accordion.
 */
export function parseInterestedSections(
  interestedSections: { [key: string]: string } | null | undefined,
  includeKey = false
): ParsedInterestedSection[] {
  return Object.keys(interestedSections || {})
    .map((encodedCourse) => {
      const courseMatch = encodedCourse.match(/P{(.*?)}S{(.*?)}M{(.*?)}/);
      if (!courseMatch) {
        console.error("Error parsing interested course:", encodedCourse);
        return null;
      }
      const meetingPatternMatch =
        courseMatch[3]!.match(/(.*) \| (.*) \| (.*)/) ||
        courseMatch[3]!.match(/(.*) \| (.*)/);
      let meetingPattern;
      if (meetingPatternMatch) {
        meetingPattern = `${meetingPatternMatch[1]} at ${meetingPatternMatch[2]!
          .replaceAll(" ", "")
          .replaceAll(":00", "")
          .toLowerCase()}`;
      } else {
        meetingPattern = courseMatch[3]!;
      }

      const indexOfDash = courseMatch[2]!.indexOf("-");
      let indexOfEnd = courseMatch[2]!.indexOf("(-)");
      if (indexOfEnd === -1) indexOfEnd = courseMatch[2]!.length;

      const courseCode = courseMatch[2]!
        .substring(0, indexOfDash)
        .replace(" ", "");
      const professor = courseMatch[1]!;
      const courseName = courseMatch[2]!
        .substring(indexOfDash + 1, indexOfEnd)
        .trim();

      return courseMatch
        ? {
            type: "interested",
            courseCode,
            courseName,
            professor,
            meetingPattern,
            ...(includeKey && { key: encodedCourse }),
          }
        : null;
    })
    .filter((parsedSection) => parsedSection != null);
}

/**
 *
 * @param {*} encodedCoursesTaken A courses taken string array from the userInfo object in Chrome storage.
 * @returns An array of courses taken objects, that can be used for the courses taken accordion.
 */
export function parseTakenCourses(
  encodedCoursesTaken: string[],
  includeKey = false
): ParsedCourseTaken[] {
  return encodedCoursesTaken
    .map((encodedCourse) => {
      const courseMatch = encodedCourse.match(/P{(.*?)}C{(.*?)}T{(.*?)}/);
      if (!courseMatch) return null;

      const firstDash = courseMatch[2]!.indexOf("-");
      let secondDash = courseMatch[2]!.indexOf("-", firstDash + 1);
      if (secondDash === -1 || secondDash - firstDash > 5) {
        secondDash = firstDash;
      }

      let indexOfEnd = courseMatch[2]!.indexOf("(-)");
      if (courseMatch[2]!.indexOf("((-))") !== -1)
        indexOfEnd = courseMatch[2]!.indexOf("((-))");
      if (indexOfEnd === -1) indexOfEnd = courseMatch[2]!.length;

      const courseCode = courseMatch[2]!
        .substring(0, firstDash)
        .replace(" ", "");
      const professor = courseMatch[1] || "unknown";
      const courseName = courseMatch[2]!
        .substring(secondDash + 1, indexOfEnd)
        .trim();
      return courseMatch
        ? {
            type: "taken",
            courseCode,
            courseName,
            professor,
            quarter: courseMatch[3]!,
            ...(includeKey && { key: encodedCourse }),
          }
        : null;
    })
    .filter((parsedCourse) => parsedCourse != null)
    .sort(mostRecentTermFirst);
}

/**
 * Comparator function to sort courses by the most recent term first.
 */
export function mostRecentTermFirst(
  courseA: ParsedCourseTaken,
  courseB: ParsedCourseTaken
) {
  let termA = courseA.quarter || "Fall 2000";
  let termB = courseB.quarter || "Fall 2000";
  if (termA === "Not taken at SCU") termA = "Fall 2000";
  if (termB === "Not taken at SCU") termB = "Fall 2000";
  const [quarterA, yearA] = termA.split(" ");
  const [quarterB, yearB] = termB.split(" ");
  if (termA === termB) {
    return courseA.courseCode.localeCompare(courseB.courseCode);
  } else if (yearA === yearB) {
    return quarterCompareDescending(quarterA!, quarterB!);
  } else {
    return parseInt(yearB!) - parseInt(yearA!);
  }
}

function quarterCompareDescending(quarterA: string, quarterB: string) {
  const quarters = ["Fall", "Summer", "Spring", "Winter"];
  return quarters.indexOf(quarterA) - quarters.indexOf(quarterB);
}

export function getRelevantCourseTimes(type: string) {
  if (type === "interested") {
    return [
      "M W F | 8:00 AM - 9:05 AM",
      "M W F | 9:15 AM - 10:20 AM",
      "M W F | 10:30 AM - 11:35 AM",
      "T Th | 2:00 PM - 3:40 PM",
      "M W F | 11:45 AM - 12:50 PM",
      "T Th | 12:10 PM - 1:50 PM",
      "T Th | 3:50 PM - 5:30 PM",
      "T Th | 5:40 PM - 7:20 PM",
      "M W F | 1:00 PM - 2:05 PM",
      "M W | 5:25 PM - 7:10 PM",
      "T Th | 10:20 AM - 12:00 PM",
      "M W | 3:30 PM - 5:15 PM",
      "T | 3:50 PM - 5:30 PM",
      "W | 2:15 PM - 5:15 PM",
      "T Th | 8:30 AM - 10:10 AM",
      "T | 2:00 PM - 5:00 PM",
      "M | 2:15 PM - 5:15 PM",
      "T | 2:00 PM - 5:20 PM",
      "M W F | 2:15 PM - 3:20 PM",
      "M W | 1:00 PM - 3:20 PM",
      "T Th | 2:00 PM - 4:20 PM",
      "T Th | 8:30 AM - 10:50 AM",
      "M W | 3:30 PM - 5:50 PM",
      "T Th | 11:00 AM - 1:20 PM",
      "M W | 10:30 AM - 12:50 PM",
      "M W | 8:00 AM - 10:20 AM",
      "W | 5:00 PM - 6:00 PM",
      "Th | 2:15 PM - 3:15 PM",
      "T Th | 5:10 PM - 7:00 PM",
      "Th | 2:15 PM - 5:00 PM",
      "F | 2:15 PM - 5:00 PM",
      "F | 5:10 PM - 6:10 PM",
      "M | 2:15 PM - 5:00 PM",
      "T | 5:15 PM - 8:00 PM",
      "W | 2:15 PM - 5:00 PM",
      "Th | 5:10 PM - 7:00 PM",
      "W | 7:10 PM - 9:00 PM",
      "T | 5:10 PM - 7:00 PM",
      "M | 5:10 PM - 7:00 PM",
      "F | 2:15 PM - 3:30 PM",
      "T | 12:15 PM - 3:00 PM",
      "T | 3:50 PM - 6:35 PM",
      "W | 8:45 AM - 11:30 AM",
      "W | 12:15 PM - 3:00 PM",
      "Th | 12:15 PM - 3:00 PM",
      "Th | 3:50 PM - 6:35 PM",
      "T | 10:20 AM - 1:05 PM",
      "T | 2:00 PM - 4:45 PM",
      "W | 3:50 PM - 6:35 PM",
      "Th | 10:20 AM - 1:05 PM",
      "Th | 2:00 PM - 4:45 PM",
      "T | 2:15 PM - 5:00 PM",
      "F | 2:15 PM - 3:20 PM",
      "T | 12:10 PM - 2:55 PM",
      "Th | 12:10 PM - 2:55 PM",
      "T | 5:40 PM - 8:25 PM",
      "W | 10:20 AM - 1:05 PM",
      "T Th | 2:15 PM - 5:00 PM",
      "M | 5:30 PM - 7:00 PM",
      "W | 5:30 PM - 7:00 PM",
      "M | 5:25 PM - 7:10 PM",
      "T | 11:15 AM - 2:00 PM",
      "Th | 11:15 AM - 2:00 PM",
      "M | 5:10 PM - 8:00 PM",
      "M | 2:15 PM - 4:00 PM",
      "W | 5:25 PM - 7:10 PM",
      "M | 2:15 PM - 5:05 PM",
      "T | 8:20 AM - 11:10 AM",
      "T | 12:10 PM - 3:00 PM",
      "T | 3:20 PM - 6:10 PM",
      "W | 2:15 PM - 5:05 PM",
      "W | 5:30 PM - 8:20 PM",
      "Th | 8:20 AM - 11:10 AM",
      "Th | 12:10 PM - 3:00 PM",
      "Th | 3:20 PM - 6:10 PM",
      "T | 6:00 PM - 7:05 PM",
      "T | 7:15 PM - 8:20 PM",
      "T | 12:10 PM - 4:10 PM",
      "F | 2:15 PM - 5:05 PM",
      "T | 1:15 PM - 4:10 PM",
      "T | 12:10 PM - 1:15 PM",
      "F | 4:00 PM - 5:00 PM",
      "W Th | 2:15 PM - 3:15 PM",
      "W Th | 3:15 PM - 6:15 PM",
      "M | 4:45 PM - 5:45 PM",
      "Th | 4:00 PM - 5:30 PM",
      "M W F | 7:15 PM - 8:20 PM",
      "Th | 10:20 AM - 12:00 PM",
      "W | 10:30 AM - 12:30 PM",
      "Th | 12:10 PM - 1:50 PM",
      "W | 8:15 AM - 10:15 AM",
      "T | 2:00 PM - 4:00 PM",
      "Th | 2:00 PM - 4:00 PM",
      "W | 1:00 PM - 3:00 PM",
      "W | 3:00 PM - 5:00 PM",
      "M W F | 3:30 PM - 4:35 PM",
      "M | 3:50 PM - 4:50 PM",
      "T | 12:10 PM - 1:50 PM",
      "W | 2:15 PM - 3:20 PM",
      "M | 5:00 PM - 6:00 PM",
      "T | 10:20 AM - 12:00 PM",
      "W | 6:00 PM - 7:05 PM",
      "Th | 5:00 PM - 6:30 PM",
      "M | 4:45 PM - 6:25 PM",
      "T | 5:40 PM - 7:20 PM",
      "W | 4:45 PM - 6:25 PM",
      "Th | 3:50 PM - 5:30 PM",
      "T | 9:15 AM - 12:00 PM",
      "M | 5:15 PM - 8:00 PM",
      "W | 5:15 PM - 8:00 PM",
      "Th | 5:15 PM - 8:00 PM",
      "T Th | 7:10 AM - 9:00 AM",
      "M W | 5:10 PM - 7:00 PM",
      "M | 2:15 PM - 3:20 PM",
      "M | 3:30 PM - 5:15 PM",
      "T | 5:40 PM - 8:40 PM",
      "M | 5:25 PM - 8:25 PM",
      "Th | 5:40 PM - 8:40 PM",
      "M W | 7:20 PM - 9:05 PM",
      "T | 2:00 PM - 3:00 PM",
      "Th | 12:10 PM - 1:15 PM",
      "M | 11:45 AM - 12:50 PM",
      "W | 11:45 AM - 12:50 PM",
      "Th | 9:15 AM - 12:00 PM",
      "M | 10:30 AM - 11:35 AM",
      "W | 10:30 AM - 11:35 AM",
      "F | 10:30 AM - 11:35 AM",
      "M | 1:00 PM - 2:05 PM",
      "W | 1:00 PM - 2:05 PM",
      "W | 3:30 PM - 4:35 PM",
      "T | 4:20 PM - 5:25 PM",
      "T | 2:00 PM - 3:05 PM",
      "T | 3:10 PM - 4:15 PM",
      "F | 2:15 PM - 3:55 PM",
      "T | 2:50 PM - 5:35 PM",
      "W | 2:50 PM - 5:35 PM",
      "Sa | 9:00 AM - 5:00 PM",
      "M | 3:30 PM - 4:35 PM",
      "F | 9:15 AM - 12:00 PM",
      "F | 1:00 PM - 3:45 PM",
      "W | 3:50 PM - 5:00 PM",
      "W | 5:25 PM - 7:10 PM",
      "W | 3:50 PM - 5:30 PM",
      "W | 2:15 PM - 3:55 PM",
      "T | 2:00 PM - 3:40 PM",
      "M W | 9:15 AM - 10:55 AM",
      "T | 3:50 PM - 7:10 PM",
      "W | 3:40 PM - 6:55 PM",
      "W | 3:50 PM - 6:50 PM",
      "T | 3:50 PM - 6:50 PM",
      "W | 3:30 PM - 5:15 PM",
      "Th | 2:00 PM - 3:40 PM",
      "M W F | 4:45 PM - 5:50 PM",
      "M W F | 6:00 PM - 7:05 PM",
      "T | 8:30 AM - 10:10 AM",
      "Th | 8:30 AM - 10:10 AM",
      "T | 11:00 AM - 1:45 PM",
      "Th | 11:00 AM - 1:45 PM",
      "W | 2:15 PM - 4:15 PM",
      "W | 3:30 PM - 5:30 PM",
      "M | 2:15 PM - 4:15 PM",
      "W | 5:25 PM - 8:25 PM",
      "T | 7:00 PM - 10:00 PM",
      "M W | 5:10 PM - 6:20 PM",
      "W | 7:30 PM - 10:00 PM",
      "W | 4:00 PM - 7:00 PM",
      "M | 7:00 PM - 10:00 PM",
      "F | 10:30 AM - 12:00 PM",
      "M W | 9:15 AM - 10:20 AM",
      "M W | 10:30 AM - 11:35 AM",
      "M W | 11:45 AM - 12:50 PM",
      "M | 3:30 PM - 5:10 PM",
      "T Th | 7:00 PM - 10:00 PM",
      "T | 8:15 AM - 11:00 AM",
      "Th | 8:15 AM - 11:00 AM",
      "W | 6:00 PM - 9:15 PM",
      "T | 3:50 PM - 7:05 PM",
      "W | 4:45 PM - 6:15 PM",
      "M | 12:00 PM - 1:00 PM",
      "T Th | 12:15 PM - 1:15 PM",
      "Th | 9:00 AM - 10:00 AM",
      "M | 3:30 PM - 4:30 PM",
      "W | 2:15 PM - 3:15 PM",
      "M W | 6:00 PM - 7:45 PM",
      "T Th | 7:30 PM - 9:10 PM",
      "F | 11:45 AM - 3:00 PM",
      "M W | 4:45 PM - 6:30 PM",
      "M W | 11:45 AM - 1:25 PM",
      "W | 4:45 PM - 5:50 PM",
      "M W | 3:30 PM - 5:10 PM",
    ].sort();
  }
  const times = [];
  const thisYear = new Date().getFullYear();
  const relevantYears = [
    thisYear + 1,
    thisYear,
    thisYear - 2,
    thisYear - 3,
    thisYear - 4,
    thisYear - 5,
  ];
  const quarters = ["Fall", "Summer", "Spring", "Winter"];
  for (const year of relevantYears) {
    for (const quarter of quarters) {
      times.push(`${quarter} ${year}`);
    }
  }
  return times;
}
