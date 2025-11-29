interface RmpRef { __ref: string; }

export interface RmpDataset {
    profRatings: ProfessorRating[];
    profsWithNoRatings: string[];
}

export interface RmpTeacher {
    __id: string;
    __typename: string;
    id: string; // base64 id
    legacyId: number; // numeric id used in canonical professor URLs
    firstName?: string;
    lastName?: string;
    department: string;
    school: RmpRef; // { __ref: base64 School id }
    isSaved: boolean;
    numRatings: number;
    avgRating: number;
    avgDifficulty: number;
    wouldTakeAgainPercent: number;
}export type RatingValue = number | "N/A";
export type BoolValue = boolean | "N/A";

export interface StudentRating {
    courseCode: string;
    date: string; // YYYY-MM-DD
    qualityRating: RatingValue;
    difficultyRating: RatingValue;
    forCredit: BoolValue;
    attendance: BoolValue;
    textbookRequired: BoolValue;
    gradeReceived: string;
    wouldTakeAgain: string;
    tagsGiven: string[];
    comment: string;
    likes: number;
    dislikes: number;
}

export interface ProfessorRating {
    profName: string;
    qualityRating: RatingValue;
    difficultyRating: RatingValue;
    totalRatings: RatingValue;
    wouldTakeAgainPercent: RatingValue;
    topTags: string[];
    studentRatings: StudentRating[];
}

export interface ExtendedProfessorRating extends ProfessorRating {
    originalName: string;
    link: string;
}

export interface OutputJson {
    professorRatings: ExtendedProfessorRating[];
}

