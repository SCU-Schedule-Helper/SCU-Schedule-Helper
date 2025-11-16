import {
  evalsAndTerms,
  aggregateEvals,
  writeAggregateEvals,
} from "../index.js";

export default async function generateAggregateEvalsFile() {
  console.log("Generating aggregate evals...");
  aggregateEvals.departmentStatistics = {};
  for (const evaluation of evalsAndTerms.evals) {
    // Generate an aggregate rating for the professor, and also with granularity at department and course level.
    const profAggregateRatings = aggregateEvals[evaluation.profName] ?? {
      type: "prof",
    };
    const profRatingTypes = [
      "overall",
      evaluation.deptName,
      evaluation.courseCode,
    ];
    for (let i = 0; i < profRatingTypes.length; i++) {
      const ratingType = profRatingTypes[i];
      const currentRating =
        profAggregateRatings[ratingType] ?? getDefaultRating();
      const newRating = generateNewAggregateRating(
        currentRating,
        evaluation,
        i === 2,
        false,
      );
      profAggregateRatings[ratingType] = newRating;
    }
    aggregateEvals[evaluation.profName] = profAggregateRatings;

    // Generate an aggregate rating for the course.
    let courseAggregateRating =
      aggregateEvals[evaluation.courseCode] ?? getDefaultRating();
    courseAggregateRating = generateNewAggregateRating(
      courseAggregateRating,
      evaluation,
      true,
      true,
    );
    aggregateEvals[evaluation.courseCode] = {
      ...aggregateEvals[evaluation.courseCode],
      ...courseAggregateRating,
    };
    if (!aggregateEvals.departmentStatistics[evaluation.deptName]) {
      aggregateEvals.departmentStatistics[evaluation.deptName] = {
        qualityAvgs: [],
        difficultyAvgs: [],
        workloadAvgs: [],
      };
    }
    if (evaluation.qualityRating)
      aggregateEvals.departmentStatistics[evaluation.deptName].qualityAvgs.push(
        toFixedNumber(evaluation.qualityRating, 4),
      );
    if (evaluation.difficultyRating)
      aggregateEvals.departmentStatistics[
        evaluation.deptName
      ].difficultyAvgs.push(evaluation.difficultyRating);
    if (evaluation.workloadRating)
      aggregateEvals.departmentStatistics[
        evaluation.deptName
      ].workloadAvgs.push(toFixedNumber(evaluation.workloadRating, 4));
  }
  for (const deptName in aggregateEvals.departmentStatistics) {
    const deptStats = aggregateEvals.departmentStatistics[deptName];
    deptStats.qualityAvgs.sort();
    deptStats.difficultyAvgs.sort();
    deptStats.workloadAvgs.sort();
    aggregateEvals.departmentStatistics[deptName] = {
      ...deptStats,
    };
  }
  console.log("Finished generating aggregate evals.");
  await writeAggregateEvals();
}

function generateNewAggregateRating(
  currentRating,
  evaluation,
  includeRecentTerms,
  isCourseEval,
) {
  const newRating = {
    qualityTotal: currentRating.qualityTotal + evaluation.qualityRating,
    qualityCount: currentRating.qualityCount + 1,
    difficultyTotal:
      currentRating.difficultyTotal + evaluation.difficultyRating ?? 0,
    difficultyCount:
      currentRating.difficultyCount + (evaluation.difficultyRating ? 1 : 0),
    workloadTotal: currentRating.workloadTotal + evaluation.workloadRating ?? 0,
    workloadCount:
      currentRating.workloadCount + (evaluation.workloadRating ? 1 : 0),
  };
  let parentTerm = (evaluation.term.match(/AP_\d\d_[a-zA-Z]{2,3}/) || [""])[0];
  let termName = evalsAndTerms.termIdsToTermNames[evaluation.term] || evalsAndTerms.termIdsToTermNames[parentTerm];
  if (includeRecentTerms) {
    const recentTermsSet = new Set(currentRating.recentTerms);
    recentTermsSet.add(termName);
    newRating.recentTerms =
      Array.from(recentTermsSet).sort(mostRecentTermFirst);
  }
  if (isCourseEval) {
    if (newRating.recentTerms[0] === termName) {
      newRating.courseName = evaluation.courseName;
    }
    const profsSet = new Set(currentRating.professors);
    profsSet.add(evaluation.profName);
    newRating.professors = Array.from(profsSet).sort();
    newRating.type = "course";
  }
  return newRating;
}

function getDefaultRating() {
  return {
    qualityTotal: 0,
    qualityCount: 0,
    difficultyTotal: 0,
    difficultyCount: 0,
    workloadTotal: 0,
    workloadCount: 0,
  };
}

function mostRecentTermFirst(termA, termB) {
  const [quarterA, yearA] = termA.split(" ");
  const [quarterB, yearB] = termB.split(" ");
  if (yearA === yearB) {
    return quarterCompareDescending(quarterA, quarterB);
  } else {
    return yearB - yearA;
  }
}

function quarterCompareDescending(quarterA, quarterB) {
  const quarters = ["Fall", "Summer", "Spring", "Winter"];
  return quarters.indexOf(quarterA) - quarters.indexOf(quarterB);
}

function toFixedNumber(num, digits) {
  const pow = Math.pow(10, digits);
  return Math.round(num * pow) / pow;
}
