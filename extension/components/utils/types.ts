import { AlertColor } from "@mui/material";

export type SendAlertFunction = (message: string, type: AlertColor) => void;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  preferences: UserPreferences;
  interestedSections: string[];
  coursesTaken: string[];
}

export type EvalsData = {
  departmentStatistics: {
    [departmentCode: string]: DepartmentStats;
  };
} & {
  [key: string]: ProfessorData | CourseData;
};

export interface DepartmentStats {
  qualityAvgs: number[];
  difficultyAvgs: number[];
  workloadAvgs: number[];
}

/**
 * Evaluation data aggregated by professor.
 */
export type ProfessorData = {
  type: "prof";
  // For professors, three types of evaluations are possible: overall, department, and course.
  // The overall evaluation is the aggregate of all evaluations for the professor, found at key "overall".
  // The department evaluations are evaluations aggregated by a department code for a professor,
  // found at the key DEPT where DEPT is the 4-letter department code. If the professor only teaches in one department,
  // then the (singular) department evaluation will be the same as the overall evaluation.
  // The course evaluations are evaluations aggregated by specific course code, found at the key COURSE where COURSE is the course code, i.e. CSCI62.
  overall: Evaluation;
} & {
  [departmentOrCourseCode: string]: Evaluation | ProfessorCourseEvaluation;
};

/**
 * Evaluation data aggregated by course.
 */
export interface CourseData extends Evaluation {
  type: "course";
  recentTerms: string[];
  courseName: string;
  professors: string[];
}

export interface Evaluation {
  qualityTotal: number;
  qualityCount: number;
  difficultyTotal: number;
  difficultyCount: number;
  workloadTotal: number;
  workloadCount: number;
}

/**
 * Evaluation data aggregated for a specific professor and course.
 */
export interface ProfessorCourseEvaluation extends Evaluation {
  recentTerms: string[];
}

export interface SectionTimeRangePreferences {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface ScoreWeightingPreferences {
  scuEvals: number;
  rmp: number;
}

export interface UserPreferences {
  difficulty: number;
  preferredSectionTimeRange: SectionTimeRangePreferences;
  scoreWeighting: ScoreWeightingPreferences;
  courseTracking: boolean;
  showRatings: boolean;
}
export interface ParsedInterestedSection {
  type: string;
  courseCode: string;
  courseName: string;
  professor: string;
  meetingPattern: string;
  key?: string;
}

export interface ParsedCourseTaken {
  type: string;
  courseCode: string;
  courseName: string;
  professor: string;
  quarter: string;
  key?: string;
}
