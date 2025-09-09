import { COURSE_TAKEN_PATTERN, INTERESTED_SECTION_PATTERN } from "../utils/constants";
import { CourseData, EvalsData, Evaluation, ProfessorData, RmpTeacher, SectionTimeRangePreferences, UserPreferences } from "../../public/utils/types";

enum FetchStatus {
  NotFetched,
  Fetching,
  Fetched,
}

enum Difficulty {
  VeryEasy,
  Easy,
  Medium,
  Hard,
  VeryHard,
}

interface UserInfo {
  id?: string;
  name?: string;
  preferences?: UserPreferences;
}

interface Friend { name: string }

interface RatingInfo {
  rmpLink: string;
  rmpQuality?: number;
  rmpDifficulty?: number;
  scuEvalsQuality?: number | null;
  scuEvalsDifficulty?: number | null;
  scuEvalsWorkload?: number | null;
  scuEvalsQualityPercentile?: number | null;
  scuEvalsDifficultyPercentile?: number | null;
  scuEvalsWorkloadPercentile?: number | null;
  matchesTimePreference?: boolean;
  meetingPattern?: string | null;
  friendsTaken: string[];
  friendsInterested: string[];
}

(async function () {
  await chrome.runtime.sendMessage("runStartupChecks");

  const courseTakenPattern = COURSE_TAKEN_PATTERN; // P{profName}C{courseCode}T{termName}
  const interestedSectionPattern = INTERESTED_SECTION_PATTERN; // P{profName}S{full section string}M{meetingPattern}E{expirationTimestamp}
  const debounceDelay = 100;

  let evalsData: EvalsData;
  let userInfo: UserInfo = {};
  let inTooltip = false;
  let inButton = false;
  let friendInterestedSections: Record<string, Record<string, string>> = {};
  let friendCoursesTaken: Record<string, Record<string, string>> = {};
  let friends: Record<string, Friend> = {};
  let currentUrl = window.location.href;
  let enrollmentStatsStatus: FetchStatus = FetchStatus.NotFetched;
  let enrollmentStats: Record<string, string> = {};
  let debounceTimer: number;
  let prefferedDifficulty: number = Difficulty.VeryEasy;
  let preferredDifficultyPercentile = prefferedDifficulty / 4;

  const observer = new MutationObserver(checkPage);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  async function checkPage() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(async () => {
      if (currentUrl !== window.location.href) {
        currentUrl = window.location.href;
        enrollmentStatsStatus = FetchStatus.NotFetched;
        enrollmentStats = {};
        inTooltip = false;
        inButton = false;
      }
      const pageTitle = document.querySelector<HTMLElement>(
        '[data-automation-id="pageHeaderTitleText"]'
      );
      const isSavedSchedulePage =
        pageTitle?.innerText === "View Student Registration Saved Schedule"
          ? true
          : false; // Saved Schedule Page
      const isFindCoursesPage = document.querySelector(
        '[data-automation-label="SCU Find Course Sections"]'
      ); // Find Courses Page

      if (isFindCoursesPage || isSavedSchedulePage) {
        const data = await chrome.storage.local.get([
          "evals",
          "userInfo",
          "friendInterestedSections",
          "friendCoursesTaken",
          "friends",
        ]);
        userInfo = (data.userInfo as UserInfo) || {};
        if (userInfo.preferences && userInfo.preferences.difficulty) {
          prefferedDifficulty = userInfo.preferences.difficulty;
          preferredDifficultyPercentile = prefferedDifficulty / 4;
        }
        if (
          userInfo.preferences &&
          !nullOrUndefined(userInfo.preferences.showRatings)
        ) {
          if (!userInfo.preferences.showRatings) return;
        }
        evalsData = (data.evals as EvalsData) || { departmentStatistics: {} } as EvalsData;
        friendInterestedSections =
          (data.friendInterestedSections as Record<string, Record<string, string>>) || {};
        friendCoursesTaken =
          (data.friendCoursesTaken as Record<string, Record<string, string>>) || {};
        friends = (data.friends as Record<string, Friend>) || {};
      }
      if (isFindCoursesPage) {
        await handleFindSectionsGrid();
      } else if (isSavedSchedulePage) {
        if (enrollmentStatsStatus === FetchStatus.NotFetched) {
          enrollmentStatsStatus = FetchStatus.Fetching;
          await findEnrollmentStatistics();
          enrollmentStatsStatus = FetchStatus.Fetched;
          await handleSavedSchedulePageGrid();
        }
        if (enrollmentStatsStatus === FetchStatus.Fetched) {
          await handleSavedSchedulePageGrid();
        }
      }
    }, debounceDelay);
  }

  async function handleFindSectionsGrid() {
    const courseSectionRows = document.querySelectorAll<HTMLTableRowElement>(
      "table tbody tr"
    );

    await Promise.all(
      Array.from(courseSectionRows).map(async (row: HTMLTableRowElement) => {
        const courseSectionCell = row.cells[0]!;
        const courseText = courseSectionCell.innerText.trim();
        if (courseText === "" || courseSectionCell.hasAttribute("has-ratings"))
          return;
        courseSectionCell.setAttribute("has-ratings", "true");
        const instructorCell = row.cells[6]!;
        const professorName = instructorCell.innerText.trim().split("\n")[0] || "";
        const courseTitleHeight = courseSectionCell.firstElementChild
          ? window.getComputedStyle(courseSectionCell.firstElementChild).height
          : "0px";
        const ratingsHeight = 121;
        row.style.height = parseInt(courseTitleHeight) + ratingsHeight + "px";
        await displayProfessorDifficulty(
          courseSectionCell,
          row,
          professorName,
          false
        );
      })
    );
  }

  async function handleSavedSchedulePageGrid() {
    const courses = document.querySelectorAll<HTMLTableRowElement>('[data-testid="table"] tbody tr');

    await Promise.all(
      Array.from(courses).map(async (courseRow: HTMLTableRowElement) => {
        const courseCell = courseRow.cells[0]!;
        const courseText = courseCell.innerText.trim();
        if (courseText === "" || courseRow.cells.length < 10) return;
        if (courseCell.hasAttribute("has-ratings")) return;
        courseCell.setAttribute("has-ratings", "true");
        const instructorCell = courseRow.cells[6]!;
        const professorName = instructorCell.innerText.trim().split("\n")[0]!;
        const pushDown = document.createElement("div");
        pushDown.style.height = "100px";

        courseCell.appendChild(pushDown);
        await displayProfessorDifficulty(
          courseCell,
          courseRow,
          professorName,
          true
        );
        courseCell.removeChild(pushDown);
      })
    );
  }

  async function displayProfessorDifficulty(
    courseSectionCell: HTMLTableCellElement,
    mainSectionRow: HTMLTableRowElement,
    professorName: string,
    isSavedSchedulePage: boolean
  ) {
    const difficultyContainer = document.createElement("div");
    difficultyContainer.style.fontSize = "1em";
    difficultyContainer.style.color = "gray";
    difficultyContainer.style.marginTop = "5px";

    const rmpResponse: RmpTeacher | null = await chrome.runtime.sendMessage({
      type: "getRmpRatings",
      profName: professorName,
    });
    let scuEvalsQuality: number | null = null;
    let scuEvalsDifficulty: number | null = null;
    let scuEvalsWorkload: number | null = null;
    let rmpLink = `https://www.ratemyprofessors.com/search/professors?q=${getProfName(
      professorName,
      true
    )}`;
    if (rmpResponse && rmpResponse.legacyId)
      rmpLink = `https://www.ratemyprofessors.com/professor/${rmpResponse.legacyId}`;

    const prof = getProfName(professorName);
    const courseText = courseSectionCell.innerText.trim();

    const courseCode = courseText
      .substring(0, courseText.indexOf("-"))
      .replace(/\s/g, "");
    const department = courseText.substring(0, courseText.indexOf(" "));
    const profData: ProfessorData | undefined = evalsData?.[prof] as ProfessorData | undefined;
    if (profData?.[courseCode]) {
      const avg = getScuEvalsAvgMetric(profData[courseCode]);
      if (avg) ({ scuEvalsQuality, scuEvalsDifficulty, scuEvalsWorkload } = avg);
    } else if (profData?.[department]) {
      const avg = getScuEvalsAvgMetric(profData[department]);
      if (avg) ({ scuEvalsQuality, scuEvalsDifficulty, scuEvalsWorkload } = avg);
    } else if (profData?.overall) {
      const avg = getScuEvalsAvgMetric(profData.overall);
      if (avg) ({ scuEvalsQuality, scuEvalsDifficulty, scuEvalsWorkload } = avg);
    } else if (evalsData?.[courseCode]) {
      const avg = getScuEvalsAvgMetric(evalsData?.[courseCode] as CourseData);
      if (avg) ({ scuEvalsQuality, scuEvalsDifficulty, scuEvalsWorkload } = avg);
    }

    // Decide which cell to get meeting pattern from
    let meetingPattern: string | null = null;
    if (isSavedSchedulePage) {
      meetingPattern = (mainSectionRow.cells[9]!.textContent || "").trim();
    } else {
      meetingPattern = (mainSectionRow.cells[8]!.textContent || "").trim();
    }

    const timeMatch = meetingPattern.match(
      /\d{1,2}:\d{2} [AP]M - \d{1,2}:\d{2} [AP]M/
    );
    let timeWithinPreference = false;
    if (timeMatch) {
      const meetingTime = timeMatch[0];
      if (isTimeWithinPreference(meetingTime)) {
        timeWithinPreference = true;
      }
    }

    const friendsTaken: string[] = [];
    for (const friend in friendCoursesTaken[courseCode]) {
      const match =
        friendCoursesTaken[courseCode][friend]!.match(courseTakenPattern);
      if (!match) continue;
      if (
        !match[1] ||
        match[1].includes(prof) ||
        match[1] === "Not taken at SCU"
      ) {
        friendsTaken.push(friends[friend]!.name);
      }
    }

    const friendsInterested: string[] = [];
    for (const friend in friendInterestedSections[courseCode]) {
      if (friendInterestedSections[courseCode][friend]!.includes(prof)) {
        const match = friendInterestedSections[courseCode][friend]!.match(
          interestedSectionPattern
        );
        if (match && courseText === match[2]) {
          friendsInterested.push(friends[friend]!.name);
        }
      }
    }

    const qualityAvgs =
      evalsData.departmentStatistics?.[department]?.qualityAvgs;
    const difficultyAvgs =
      evalsData.departmentStatistics?.[department]?.difficultyAvgs;
    const workloadAvgs =
      evalsData.departmentStatistics?.[department]?.workloadAvgs;

    // Edge case: course eval data is available, but percentile is not.
    let scuEvalsQualityPercentile = getPercentile(scuEvalsQuality, qualityAvgs);
    if (scuEvalsQuality && !scuEvalsQualityPercentile) {
      scuEvalsQualityPercentile = (scuEvalsQuality - 1) / 4;
    }
    let scuEvalsDifficultyPercentile = getPercentile(
      scuEvalsDifficulty,
      difficultyAvgs
    );
    if (scuEvalsDifficulty && !scuEvalsDifficultyPercentile) {
      scuEvalsDifficultyPercentile = (scuEvalsDifficulty - 1) / 4;
    }
    let scuEvalsWorkloadPercentile = getPercentile(
      scuEvalsWorkload,
      workloadAvgs
    );
    if (scuEvalsWorkload && !scuEvalsWorkloadPercentile) {
      scuEvalsWorkloadPercentile = scuEvalsWorkload / 15.0;
    }

    await appendRatingInfoToCell(courseSectionCell, isSavedSchedulePage, {
      rmpLink,
      rmpQuality: rmpResponse?.avgRating,
      rmpDifficulty: rmpResponse?.avgDifficulty,
      scuEvalsQuality,
      scuEvalsDifficulty,
      scuEvalsWorkload,
      scuEvalsQualityPercentile,
      scuEvalsDifficultyPercentile,
      scuEvalsWorkloadPercentile,
      matchesTimePreference: timeWithinPreference,
      meetingPattern: meetingPattern,
      friendsTaken,
      friendsInterested,
    });
  }

  function getScuEvalsAvgMetric(
    rating: Evaluation
  ): { scuEvalsQuality: number; scuEvalsDifficulty: number; scuEvalsWorkload: number } | null {
    if (
      !rating ||
      !rating.qualityTotal ||
      !rating.qualityCount ||
      !rating.difficultyTotal ||
      !rating.difficultyCount ||
      !rating.workloadTotal ||
      !rating.workloadCount
    )
      return null;
    return {
      scuEvalsQuality: rating.qualityTotal / rating.qualityCount,
      scuEvalsDifficulty: rating.difficultyTotal / rating.difficultyCount,
      scuEvalsWorkload: rating.workloadTotal / rating.workloadCount,
    };
  }

  function calcOverallScore(scores: RatingInfo): number | null {
    const { scuEvals = 50, rmp = 50 } =
      userInfo?.preferences?.scoreWeighting || {};
    const {
      rmpQuality,
      rmpDifficulty,
      scuEvalsQualityPercentile,
      scuEvalsDifficultyPercentile,
      scuEvalsWorkloadPercentile,
    } = scores;
    if (
      !rmpQuality &&
      !rmpDifficulty &&
      !scuEvalsQualityPercentile &&
      !scuEvalsDifficultyPercentile &&
      !scuEvalsWorkloadPercentile
    )
      return null;

    if (nullOrUndefined(rmpQuality) || nullOrUndefined(rmpDifficulty)) {
      return scuEvalsScore(
        (scuEvalsQualityPercentile ?? 0),
        (scuEvalsDifficultyPercentile ?? 0),
        (scuEvalsWorkloadPercentile ?? 0)
      );
    }
    if (
      nullOrUndefined(scuEvalsQualityPercentile) ||
      nullOrUndefined(scuEvalsDifficultyPercentile) ||
      nullOrUndefined(scuEvalsWorkloadPercentile)
    ) {
      return rmpScore(rmpQuality!, rmpDifficulty!);
    }
    return (
      scuEvalsScore(
        scuEvalsQualityPercentile!,
        scuEvalsDifficultyPercentile!,
        scuEvalsWorkloadPercentile!
      ) *
      (scuEvals / 100) +
      rmpScore(rmpQuality!, rmpDifficulty!) * (rmp / 100)
    );
  }

  function scuEvalsScore(
    qualityPercentile: number,
    difficultyPercentile: number,
    workloadPercentile: number
  ): number {
    const qualityScore = qualityPercentile * 100;
    const difficultyScore =
      100 -
      Math.abs(preferredDifficultyPercentile - difficultyPercentile) * 100;
    const workloadScore =
      100 - Math.abs(preferredDifficultyPercentile - workloadPercentile) * 100;
    return ((qualityScore + difficultyScore + workloadScore) / 300) * 10;
  }

  function rmpScore(quality: number, difficulty: number): number {
    // Ranges go from 1 to 5, so we normalize them to 0 to 4.
    quality -= 1;
    difficulty -= 1;
    // Percentiles would be better, but we don't have that data.
    const difficultyScore = 4 - Math.abs(prefferedDifficulty - difficulty);
    return ((quality + difficultyScore) / 8) * 10;
  }

  async function appendRatingInfoToCell(
    tdElement: HTMLTableCellElement,
    isSavedSchedulePage: boolean,
    ratingInfo: RatingInfo
  ) {
    const overallScore = calcOverallScore(ratingInfo);
    const scoreContainer = document.createElement("div");
    scoreContainer.className = "SCU-Schedule-Helper-Score-Container";
    scoreContainer.style.display = "flex";
    scoreContainer.style.alignItems = "center";
    scoreContainer.style.gap = "4px";

    // Create score text
    const scoreText = document.createElement("div");
    scoreText.innerHTML = `
        <span style="font-size: 24px; font-weight: bold; color: ${getRatingColor(
      overallScore ?? undefined,
      0,
      10,
      true
    )}; ">${overallScore?.toFixed(2) || "N/A"}</span>
        <span style="color: #6c757d; font-size: 16px;">/ 10</span>
      `;

    // Create info button with tooltip
    const infoButton = document.createElement("div");
    infoButton.innerHTML = `<img src="${chrome.runtime.getURL(
      "images/info_icon.png"
    )}" alt ="info" width="17" height="17"/>`;
    infoButton.style.cssText = `
        cursor: help;
        color: #6c757d;
        font-size: 14px;
        margin-left: 4px;
        position: relative;
      `;

    // Create tooltip
    const tooltip = document.createElement("div");
    tooltip.innerHTML = createRatingToolTip(ratingInfo).innerHTML;
    tooltip.style.cssText = `
        transform: translateX(-50%);
        color: black;
        font-size: 12px;
        white-space: nowrap;
        display: none;
        z-index: 1000;
        pointer-events: auto; 
      `;
    const tooltipSignIn = tooltip.querySelector<HTMLElement>(".ssh-sign-in");
    if (tooltipSignIn) {
      tooltipSignIn.addEventListener("click", async () => {
        sshSignIn(tooltipSignIn);
      });
    }

    infoButton.addEventListener("mouseenter", (_event) => {
      inButton = true;
      document.body.appendChild(tooltip);
      tooltip.style.display = "block";

      const rect = infoButton.getBoundingClientRect();

      const tooltipX = rect.left + rect.width + 100 + window.scrollX;
      const tooltipY = rect.top - tooltip.offsetHeight + window.scrollY;

      tooltip.style.position = "absolute";
      tooltip.style.left = `${tooltipX}px`;
      tooltip.style.top = `${tooltipY}px`;
    });

    infoButton.addEventListener("mouseleave", () => {
      inButton = false;
      if (inTooltip) return;
      tooltip.style.display = "none";

      // Remove tooltip from the body
      if (tooltip.parentElement) {
        document.body.removeChild(tooltip);
      }
    });

    tooltip.addEventListener("mouseenter", () => {
      inTooltip = true;
      tooltip.style.display = "block"; // Ensure it's visible
    });

    tooltip.addEventListener("mouseleave", () => {
      inTooltip = false;
      if (inButton) return;
      tooltip.style.display = "none";

      // Remove tooltip from the body
      if (tooltip.parentElement) {
        document.body.removeChild(tooltip);
      }
    });
    const sectionTimeMatch = document.createElement("div");
    sectionTimeMatch.innerHTML = `      
            <div style="display: flex; gap: 20px; margin: 5px 0  5px 0;">
              <div style="color: #666;">
                <span style="margin-right: 4px; font-weight:bold">${(ratingInfo.matchesTimePreference && "✓") || "X"
      }</span> Section Time
              </div>
            </div>`;
    const friendsTaken = document.createElement("div");
    friendsTaken.innerHTML = `
            <div style="display: flex; gap: 20px; margin: 5px 0  5px 0;">
              <div style="color: #666;">
                <span style="margin-right: 4px; font-weight:bold">${ratingInfo.friendsTaken.length
      }</span> ${(ratingInfo.friendsTaken.length === 1 && "Friend") || "Friends"
      } Took
              </div>
            </div>
          `;
    const friendsTakenTooltip = createFriendsToolTip(ratingInfo.friendsTaken);
    friendsTaken.addEventListener("mouseenter", (_event) => {
      if (ratingInfo.friendsTaken.length === 0) return;
      document.body.appendChild(friendsTakenTooltip);
      friendsTakenTooltip.style.display = "block";

      const rect = friendsTaken.getBoundingClientRect();

      const tooltipX = rect.left + rect.width + window.scrollX;
      const tooltipY =
        rect.top - friendsTakenTooltip.offsetHeight + window.scrollY;

      friendsTakenTooltip.style.position = "absolute";
      friendsTakenTooltip.style.left = `${tooltipX - 10}px`;
      friendsTakenTooltip.style.top = `${tooltipY + 10}px`;
    });

    friendsTaken.addEventListener("mouseleave", () => {
      friendsTakenTooltip.style.display = "none";

      // Remove tooltip from the body
      if (friendsTakenTooltip.parentElement) {
        document.body.removeChild(friendsTakenTooltip);
      }
    });

    const friendsInterested = document.createElement("div");
    friendsInterested.innerHTML = `
            <div style="display: flex; gap: 20px; margin: 5px 0  5px 0;">
              <div style="color: #666;">
                <span style="margin-right: 4px; font-weight:bold">${ratingInfo.friendsInterested.length
      }</span> ${(ratingInfo.friendsInterested.length === 1 && "Friend") || "Friends"
      } Interested
              </div>
            </div>
          `;

    const friendsInterestedTooltip = createFriendsToolTip(
      ratingInfo.friendsInterested
    );
    friendsInterested.addEventListener("mouseenter", (_event) => {
      if (ratingInfo.friendsInterested.length === 0) return;
      document.body.appendChild(friendsInterestedTooltip);
      friendsInterestedTooltip.style.display = "block";

      const rect = friendsInterested.getBoundingClientRect();

      const tooltipX = rect.left + rect.width + window.scrollX;
      const tooltipY =
        rect.top - friendsInterestedTooltip.offsetHeight + window.scrollY;

      friendsInterestedTooltip.style.position = "absolute";
      friendsInterestedTooltip.style.left = `${tooltipX}px`;
      friendsInterestedTooltip.style.top = `${tooltipY}px`;
    });

    friendsInterested.addEventListener("mouseleave", () => {
      friendsInterestedTooltip.style.display = "none";

      // Remove tooltip from the body
      if (friendsInterestedTooltip.parentElement) {
        document.body.removeChild(friendsInterestedTooltip);
      }
    });

    infoButton.appendChild(tooltip);
    scoreContainer.appendChild(scoreText);
    scoreContainer.appendChild(infoButton);
    tdElement.appendChild(scoreContainer);
    tdElement.appendChild(sectionTimeMatch);
    tdElement.appendChild(friendsTaken);
    tdElement.appendChild(friendsInterested);
    if (isSavedSchedulePage) {
      const meetingPattern = tdElement.parentElement?.lastChild?.textContent;
      const enrollmentStat = meetingPattern && enrollmentStats[meetingPattern];
      const enrollmentStatsDiv = document.createElement("div");
      enrollmentStatsDiv.innerHTML = `
              <div style="display: flex; gap: 20px; margin: 5px 0  5px 0;">
                <div style="color: #666;">
                  <span style="margin-right: 4px; font-weight:bold">Seats Available: </span> ${enrollmentStat || "N/A"
        }
                </div>
              </div>
            `;
      tdElement.appendChild(enrollmentStatsDiv);
    }
  }

  function createRatingToolTip(ratingInfo: RatingInfo): HTMLElement {
    const {
      rmpLink,
      rmpQuality,
      rmpDifficulty,
      scuEvalsQuality,
      scuEvalsDifficulty,
      scuEvalsWorkload,
      scuEvalsQualityPercentile,
      scuEvalsDifficultyPercentile,
      scuEvalsWorkloadPercentile,
    } = ratingInfo;
    const ratingDiv = document.createElement("div");

    const rmpDiffValue =
      typeof rmpDifficulty === "number"
        ? Math.abs(prefferedDifficulty - (rmpDifficulty - 1))
        : undefined;
    const rmpDifficultyColor = getRatingColor(
      rmpDiffValue,
      0,
      4,
      false
    );
    const scuEvalsQualityScore = scuEvalsQualityPercentile
      ? scuEvalsQualityPercentile * 100
      : undefined;
    const scuEvalsQualityColor = getRatingColor(
      scuEvalsQualityScore,
      0,
      100,
      true
    );
    const scuEvalsDifficultyScore = scuEvalsDifficultyPercentile
      ? Math.abs(preferredDifficultyPercentile - scuEvalsDifficultyPercentile) *
      100
      : undefined;
    const scuEvalsDifficultyColor = getRatingColor(
      scuEvalsDifficultyScore,
      0,
      100,
      false
    );
    const scuEvalsWorkloadScore = scuEvalsWorkloadPercentile
      ? Math.abs(preferredDifficultyPercentile - scuEvalsWorkloadPercentile) *
      100
      : undefined;
    const scuEvalsWorkloadColor = getRatingColor(
      scuEvalsWorkloadScore,
      0,
      100,
      false
    );
    ratingDiv.innerHTML = `
        <div style="
          position: absolute;
          background-color:rgb(255, 255, 255);
          padding: 16px 16px;
          border-radius: 10px;
          border: 1px solid black;
          font-family: Arial, sans-serif;
          max-width: 250px;
          margin: 5px;
          transform: translateX(-50%);
          pointer-events: auto;
          bottom: 0px;
        ">
          <!-- Add invisible padding wrapper that maintains absolute positioning -->
          <div style="
            position: absolute;
            top: -20px;
            left: -20px;
            right: -20px;
            bottom: -20px;
            
            background-color: transparent;
            pointer-events: auto;
          "></div>
          <div style="position: relative; pointer-events: auto;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">
              Section Ratings
            </div>
            
            <div>
              <a href="${rmpLink}" target="_blank" style="color: blue; text-decoration: none; font-size: 13px;">RateMyProfessor</a>
            </div>
            
            <div style="display: flex; gap: 20px; margin: 8px 0;">
              <div>
                <span style="color: ${getRatingColor(
      rmpQuality,
      1,
      5,
      true
    )}; font-size: 16px; font-weight: bold;">${rmpQuality?.toFixed(2) || "N/A"
      }</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">quality</div>
              </div>
              <div>
                <span style="color: ${rmpDifficultyColor};font-size: 16px; font-weight: bold;">${rmpDifficulty?.toFixed(2) || "N/A"
      }</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">difficulty</div>
              </div>
            </div>
      
            <div style="font-size: 13px; margin: 12px 0 8px 0;">
              SCU Course Evaluations
            </div>
            
            <div style="display: flex; gap: 20px; margin: 8px 0;">
            ${(!userInfo.id &&
        `<div style="white-space: normal; width: 180px;">
                  <span style="text-decoration: underline; color: blue; cursor: pointer;" class="ssh-sign-in">Sign in</span> with your SCU email to use evals data. After signing in, please refresh the page.
                  <div class="ssh-sign-in-error" style="color: red; font-size: 12px; margin-top: 8px;"></div>
                </div>
                `) ||
      `
              <div>
                <span style="color: ${scuEvalsQualityColor}; font-size: 16px; font-weight: bold;">${scuEvalsQuality?.toFixed(2) || "N/A"
      }</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">quality</div>
              </div>
              <div>
                <span style="color: ${scuEvalsDifficultyColor}; font-size: 16px; font-weight: bold;">${scuEvalsDifficulty?.toFixed(2) || "N/A"
      }</span>
                <span style="color: #666;"> / 5</span>
                <div style="color: #666; font-size: 12px;">difficulty</div>
              </div>
              <div>
                <span style="color: ${scuEvalsWorkloadColor}; font-size: 16px; font-weight: bold;">${scuEvalsWorkload?.toFixed(2) || "N/A"
      }</span>
                <div style="color: #666; font-size: 12px;">hrs / wk</div>
              </div>
              `
      }
            </div>
          </div>
        </div>
      `;

    return ratingDiv;
  }

  async function sshSignIn(signInButton: HTMLElement) {
    const errorDiv = signInButton.nextElementSibling as HTMLElement;
    if (errorDiv) errorDiv.textContent = ""; // Clear previous errors
    try {
      const response = await chrome.runtime.sendMessage("signIn");
      if (response?.text) {
        if (errorDiv) errorDiv.textContent = response.text; // Display error message
      } else {
        if (errorDiv) errorDiv.setAttribute("style", "color: green");
        if (errorDiv) errorDiv.textContent =
          "Sign in successful. Please reload the page for changes to take effect.";
      }
    } catch (_ignore) {
      if (errorDiv) errorDiv.textContent = "An error occurred during sign in.";
    }
  }

  function createFriendsToolTip(friendsTakenOrInterested: string[]): HTMLElement {
    const friendsTooltipDiv = document.createElement("div");
    friendsTooltipDiv.innerHTML = `
        <div style="
          position: absolute;
          background-color: #f0f0f0;
          padding: 8px 8px;
          border-radius: 10px;
          font-family: Arial, sans-serif;
          max-width: 250px;
          margin: 5px;
          transform: translateX(-50%);
          pointer-events: auto;
          bottom: 0px;
        ">
          <div style="
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            background-color: transparent;
            pointer-events: auto;
          "></div>
          <div style="position: relative; pointer-events: auto; width:max-content">
          ${friendsTakenOrInterested.reduce((acc, friend) => {
      return (
        acc + `<div style="color: #666; font-size:14px">${friend}</div>`
      );
    }, "")}
          </div>
        </div>
      `;
    return friendsTooltipDiv;
  }

  function getProfName(profName: string, usePreferred = false): string {
    if (profName.includes("|")) {
      return profName.split("|")![+usePreferred]!.trim();
    }
    return profName;
  }

  function getRatingColor(
    rating: number | undefined,
    ratingMin: number,
    ratingMax: number,
    goodValuesAreHigher: boolean
  ): string {
    if (nullOrUndefined(rating)) return "rgba(0, 0, 0, 0.5)";
    if (rating! < ratingMin) rating = ratingMin;
    if (rating! > ratingMax) rating = ratingMax;
    const greenShade: [number, number, number] = [66, 134, 67];
    const yellowShade: [number, number, number] = [255, 165, 0];
    const redShade: [number, number, number] = [194, 59, 34];
    const ratingMid = ratingMin + (ratingMax - ratingMin) / 2;
    if ((rating!) <= ratingMid && goodValuesAreHigher) {
      return interpolateColor(
        redShade,
        yellowShade,
        ((rating!) - ratingMin) / (ratingMid - ratingMin)
      );
    }
    if ((rating!) <= ratingMid && !goodValuesAreHigher) {
      return interpolateColor(
        greenShade,
        yellowShade,
        ((rating!) - ratingMin) / (ratingMid - ratingMin)
      );
    }
    if (goodValuesAreHigher) {
      return interpolateColor(
        yellowShade,
        greenShade,
        ((rating!) - ratingMid) / (ratingMax - ratingMid)
      );
    }
    return interpolateColor(
      yellowShade,
      redShade,
      ((rating!) - ratingMid) / (ratingMax - ratingMid)
    );
  }

  function interpolateColor(color1: [number, number, number], color2: [number, number, number], ratio: number): string {
    const r = Math.round(color1[0] + ratio * (color2[0] - color1[0]));
    const g = Math.round(color1[1] + ratio * (color2[1] - color1[1]));
    const b = Math.round(color1[2] + ratio * (color2[2] - color1[2]));
    return `rgba(${r}, ${g}, ${b}, 1)`;
  }

  function isTimeWithinPreference(meetingTime: string): boolean {
    if (!meetingTime || !userInfo?.preferences) return false;

    const { startHour, startMinute, endHour, endMinute } =
      userInfo.preferences.preferredSectionTimeRange as SectionTimeRangePreferences;

    const [startTimeStr, endTimeStr] = meetingTime
      .split("-")
      .map((t) => t.trim()) as [string, string];
    const startTime = parseTime(startTimeStr);
    const endTime = parseTime(endTimeStr);

    return (
      (startTime.hours > startHour ||
        (startTime.hours === startHour && startTime.minutes >= startMinute)) &&
      (endTime.hours < endHour ||
        (endTime.hours === endHour && endTime.minutes <= endMinute))
    );
  }

  function parseTime(timeString: string): { hours: number; minutes: number } {
    const [time, period] = timeString.trim().split(/\s+/) as [string, string];
    let [hours, minutes] = time.split(":").map(Number) as [number, number];
    if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (period.toUpperCase() === "AM" && hours === 12) hours = 0;

    return { hours, minutes };
  }

  function getPercentile(value: number | null | undefined, array?: number[] | null): number | null {
    if (!value || !array || array.length === 0) return null;
    return bsFind(array, value) / array.length;
  }

  function bsFind(sortedArray: number[], target: number): number {
    let left = 0;
    let right = sortedArray.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (sortedArray[mid] === target) return mid;
      if (sortedArray[mid]! < target) left = mid + 1;
      else right = mid - 1;
    }
    return left;
  }

  async function findEnrollmentStatistics(): Promise<void> {
    const currentUrl = window.location.href;
    if (!currentUrl.includes("scu/d/inst")) {
      console.error("Page URL did not include /d/ :", currentUrl);
      return;
    }
    const apiUrl = currentUrl.replace(/scu\/d\/inst/, "scu/inst");

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error("Failed to fetch course data:", response);
      }
      const data = await response.json();
      const coursesData = data?.body?.children?.find(
        (child: any) => child.widget === "grid" && child.label === "Courses")?.rows as any[] | undefined;
      const courseSections: Array<{ meetingPattern: string | undefined; uri: string }> = [];

      for (const row of (coursesData || [])) {
        const courseSectionData = findObjectByPropertyValue(row.cellsMap, "label", "Section");
        const sectionMeetingPattern = findObjectByPropertyValue(row.cellsMap, "label", "Meeting Patterns")?.instances?.[0]?.text as string | undefined;
        if (courseSectionData) {
          if (courseSectionData.selfUriTemplate) {
            courseSections.push({
              meetingPattern: sectionMeetingPattern,
              uri: courseSectionData.selfUriTemplate,
            });
          }
        }
      }

      // Create and wait for all enrollment fetch promises concurrently.
      await Promise.all(
        courseSections.map(async (courseSection) => {
          const sectionUrl = `${courseSection.uri}.htmld`;
          const meetingPattern = courseSection.meetingPattern;

          try {
            const sectionResponse = await fetch(sectionUrl);
            if (!sectionResponse.ok) {
              console.error(
                "Failed to fetch section data:",
                sectionResponse.statusText
              );
              return;
            }

            const sectionData = await sectionResponse.json();
            let enrolledStats = findObjectByPropertyValue(
              sectionData,
              "label",
              "Seats Available"
            )?.value as string | undefined;

            if (enrolledStats) {
              if (enrolledStats.match(/-?\d+ of \d+/)) {
                const [enrolled, total] = enrolledStats.split(" of ");
                enrolledStats = `${enrolled}/${total}`;
              }
              if (meetingPattern) enrollmentStats[meetingPattern] = enrolledStats;
            }
          } catch (error) {
            console.error("Error fetching section data:", error);
          }
        })
      );
    } catch (error) {
      console.error("Error fetching course data:", error);
    }
  }

  function findObjectByPropertyValue(obj: any, key: string, value: string): any | null {
    if (typeof obj !== "object" || obj === null) {
      return null;
    }

    if (obj[key] === value) {
      return obj;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = findObjectByPropertyValue(item, key, value);
        if (result) {
          return result;
        }
      }
    } else {
      for (const prop in obj) {
        if (typeof obj[prop] === "object") {
          const result = findObjectByPropertyValue(obj[prop], key, value);
          if (result) {
            return result;
          }
        }
      }
    }

    return null;
  }

  function nullOrUndefined(object: unknown): boolean {
    return object === null || object === undefined || typeof object === "number" && isNaN(object);
  }
})();
