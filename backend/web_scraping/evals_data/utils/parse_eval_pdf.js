import { evalsAndTerms, existingEvaluations } from "../index.js";
import PDFParser from "pdf2json";

// If a course code is changed over time, we can map it here.
const COURSE_CODE_TRANSFORMATIONS = {
  COEN: "CSEN",
};

export async function extractEvalDataFromPdf(pdfBuffer, pdfName, term) {
  const pdfParser = new PDFParser(this, true);
  let parsingResolver;
  const finishedParsing = new Promise((resolver) => {
    parsingResolver = resolver;
  });

  pdfParser.on("pdfParser_dataError", (errData) => {
    console.error(`Received error parsing PDF${pdfName}${errData.parserError}`);
    parsingResolver();
  });
  pdfParser.on("pdfParser_dataReady", (pdfData) => {
    try {
      extractToJson(pdfParser.getRawTextContent(), pdfName, term);
    } catch (e) {
      console.error(`Error parsing eval PDF ${pdfName}: ${e}`);
    }
    parsingResolver();
  });

  pdfParser.parseBuffer(pdfBuffer);
  await finishedParsing;
  pdfParser.removeAllListeners();
}

function extractToJson(rawPdfText, pdfName, term) {
  if (!rawPdfText.toLowerCase().includes("class climate evaluation")) {
    console.error(`PDF ${pdfName} is not an evaluation ${rawPdfText}`);
    return;
  }
  if (
    rawPdfText.includes(
      "The evaluation will not be displayed due to low response rate.",
    )
  )
    return;

  const firstPage = getFirstPage(rawPdfText);
  const lastPage = getLastPage(rawPdfText);
  const secondPage = getSecondPage(rawPdfText);
  const profName = getProfName(lastPage);
  const deptName = getDeptName(firstPage);
  const courseCode = getCourseCode(firstPage);
  const courseName = getCourseName(profName, lastPage);

  if (
    profName === null ||
    deptName === null ||
    courseCode === null ||
    courseName === null
  ) {
    console.error(
      `Could not find prof name (${profName}), dept name (${deptName}), course code (${courseCode}), or course name (${courseName}) for pdf ${pdfName}`,
    );
    return;
  }

  const qualityRating = getQualityRating(firstPage);
  if (qualityRating === null) {
    console.error(`Could not find quality rating for eval ${pdfName}`);
    return;
  }

  const qualityDetails = getQualityDetails(lastPage);
  if (qualityDetails === null) {
    console.error(`Could not find detailed quality ratings for eval ${pdfName}`);
    return;
  }

  // Decide if the couse uses the new lab format
  const hasNewFormatPattern = /3\.\s3\./;
  const isNewFormat = secondPage.match(hasNewFormatPattern) !== null;

  let difficultyRating = null;
  let workloadRating = null;
  if (isNewFormat) {
    difficultyRating = getDifficultyRatingNewFormat(secondPage);
    workloadRating = getWorkloadRatingNewFormat(secondPage);
  } else {
    difficultyRating = getDifficultyRating(lastPage);
    workloadRating = getWorkloadRating(secondPage);
  }

  if (difficultyRating == null || workloadRating == null) {
    const hasExtraItems = lastPage.includes("1.11");
    if (!hasExtraItems) {
      console.error(
        `Could not find difficulty or workload rating for eval ${pdfName}, even though it should exist.`,
      );
      return;
    }
  }

  const evaluation = {
    name: pdfName,
    term,
    profName,
    deptName,
    courseCode,
    courseName,
    qualityRating,
    qualityDetails,
    difficultyRating,
    workloadRating,
  };

  evalsAndTerms.evals.push(evaluation);
  existingEvaluations.add(pdfName);
}

const FIRST_PAGE_BREAK = "----------------Page (0) Break----------------";
function getFirstPage(rawPdfText) {
  return rawPdfText.substring(0, rawPdfText.indexOf(FIRST_PAGE_BREAK));
}

const pageBreakPattern = /----------------Page \(\d+\) Break----------------/g;
function getLastPage(rawPdfText) {
  const pageBreaks = rawPdfText.match(pageBreakPattern);
  const lastPageBreak = pageBreaks.pop();
  const secondLastPageBreak = pageBreaks.pop();
  return rawPdfText.substring(
    rawPdfText.indexOf(secondLastPageBreak) + secondLastPageBreak.length,
    rawPdfText.indexOf(lastPageBreak),
  );
}

function getSecondPage(rawPdfText) {
  const pageBreaks = rawPdfText.match(pageBreakPattern);
  const secondPageBreak = pageBreaks[1];
  const firstPageBreak = pageBreaks[0];
  return rawPdfText.substring(
    rawPdfText.indexOf(firstPageBreak) + firstPageBreak.length,
    rawPdfText.indexOf(secondPageBreak),
  );
}

function getProfName(lastPageText) {
  const profName = lastPageText.match(/Name of the instructor:(.*)/);
  return profName ? profName[1] : null;
}

function transformDeptName(deptName) {
  return COURSE_CODE_TRANSFORMATIONS[deptName] ?? deptName;
}

const oldCourseCodePattern = /\(([A-Z]+)([0-9]+[A-Z]*)-/;
const newCourseCodePattern = /\(([A-Z]+)_(.+)_\d+_\d+_.*\)/;

function getDeptName(firstPageText) {
  const oldMatch = firstPageText.match(oldCourseCodePattern);
  const newMatch = firstPageText.match(newCourseCodePattern);

  if (oldMatch) return transformDeptName(oldMatch[1]);
  else if (newMatch) return transformDeptName(newMatch[1]);
  else return null;
}

function getCourseCode(firstPageText) {
  const oldMatches = firstPageText.match(oldCourseCodePattern);
  const newMatches = firstPageText.match(newCourseCodePattern);
  if (oldMatches) return transformDeptName(oldMatches[1]) + oldMatches[2];
  else if (newMatches) return transformDeptName(newMatches[1]) + newMatches[2];
  else return null;
}

function getCourseName(profName, lastPageText) {
  if (profName === null) return null;
  profName = profName.replace("(", "\\(").replace(")", "\\)");
  const courseNamePattern = new RegExp(`${profName},(.*)`);
  const match = lastPageText.match(courseNamePattern);
  if (match) return match[1].trim();
  else return null;
}

function getQualityRating(firstPageText) {
  const pattern = /Items\s*\d+\.\d+\s*-\s*\d+\.\d+av\.\s*=\s*([\d\.]+)/;
  const match = firstPageText.match(pattern);
  if (match) {
    return parseFloat(match[1]);
  } else {
    console.error('Quality rating not found');
    return null;
  }
}

function getQualityDetails(lastPageText) {
  const pattern = /StronglyDisagreeStrongly Agreen=(\d{0,3})av\.=(\d?\.?\d?)md=(\d)dev\.=(\d?.?\d?)/g;
  const matches = Array.from(lastPageText.matchAll(pattern));
  const result = {};
  if(matches.length !== 9) {
    console.error(`Expected 9 detailed quality ratings, found ${matches.length}`);
    return null;
  }
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (match.length < 5) {
      console.error(`Detailed quality rating pattern has unexpected format: ${match}`)
      return null;
    }
    const [_, n, average, median, deviation] = match;
    result["qualityItem1." + (i + 1)] = {
      n: parseInt(n),
      average: parseFloat(average),
      median: parseInt(median),
      deviation: parseFloat(deviation),
    };
  }
  return result;
}

const decimalPattern = /(\d+\.?\d*)/;
function getDifficultyRating(lastPageText) {
  const difficultyItem = lastPageText.indexOf("2.2)");
  if (difficultyItem == -1) return null;
  const avgIndex = lastPageText.indexOf("av.=", difficultyItem);
  const lastPageFromAvg = lastPageText.substring(avgIndex);
  const difficultyRating = lastPageFromAvg.match(decimalPattern);
  return difficultyRating ? parseFloat(difficultyRating[1]) : null;
}

function getWorkloadRating(secondPageText) {
  const values = { "0-1": 0.5, "2-3": 2.5, "4-5": 4.5, "6-7": 6.5, "8-10": 9, "11-14": 12.5, "15+": 15 };
  const pattern = /(0-1|2-3|4-5|6-7|8-10|11-14|15\+)\s*(\d+\.?\d*)%/g;
  const matches = Array.from(secondPageText.matchAll(pattern));
  const result = [];
  for (const match of matches) {
    const [_, textValue, percentage] = match;
    if (!values[textValue] || parseFloat(percentage) === NaN) {
      console.error(`Workload pattern contains invalid text or percentage: "${textValue}"`);
      return null;
    }
    result.push({ value: values[textValue], ratio: parseFloat(percentage) / 100 });
  }
  let expectedValue = 0;
  for (let i = 0; i < result.length; i++) {
    const curr = result[i];
    expectedValue += curr.value * curr.ratio;
  }
  return expectedValue;
}

function getDifficultyRatingNewFormat(secondPageText) {
  const values = { "Never": 5, "Rarely": 4, "A Few times": 3, "Often": 2, "Every lab": 1 };
  const pattern = /(Never|Rarely|A Few times|Often|Every lab)\s*(\d+\.?\d*)%/g;
  let matches = Array.from(secondPageText.matchAll(pattern));
  matches = matches.slice(0, 5);
  const result = [];
  for (const match of matches) {
    const [_, textValue, percentage] = match;
    if (!values[textValue] || parseFloat(percentage) === NaN) {
      console.error(`Difficulty pattern contains invalid text or percentage: "${textValue}"`);
      return null;
    }
    result.push({ value: values[textValue], ratio: parseFloat(percentage) / 100 });
  }
  let expectedValue = 0;
  for (let i = 0; i < result.length; i++) {
    const curr = result[i];
    expectedValue += curr.value * curr.ratio;
  }
  return expectedValue;
}

function getWorkloadRatingNewFormat(secondPageText) {
  const values = { "< 2.0": 1, "2.0": 2, "2.5": 2.5, "3.0": 3, "> 3.0": 4 };
  const pattern = /(< 2.0|2.0|2.5|3.0|> 3.0)\s*(\d+\.?\d*)%/g;
  const matches = Array.from(secondPageText.matchAll(pattern));
  const result = [];
  for (const match of matches) {// On the first page, this will be items that have 1.x) and then something.
    const [_, textValue, percentage] = match;
    if (!values[textValue] || parseFloat(percentage) === NaN) {
      console.error(`Workload pattern contains invalid text or percentage: "${textValue}"`);
      return null;
    }
    result.push({ value: values[textValue], ratio: parseFloat(percentage) / 100 });
  }
  let expectedValue = 0;
  for (let i = 0; i < result.length; i++) {
    const curr = result[i];
    expectedValue += curr.value * curr.ratio;
  }
  return expectedValue;
}
