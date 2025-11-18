import { useRef, useEffect, useState } from "react";
import { Fade } from "@mui/material";
import ProgressCard from "../shared/ProgressCard";
import {
  ACADEMIC_PERIOD_PATTERN,
  CourseData,
  selectAllByTextContent,
  selectByTextContent,
  updateUserCourseData,
  waitForSelector,
  waitForSelectorGone,
} from "../shared/utils";

export default function CourseHistoryImporter({
  sendResponse = (_response?: string) => {},
}) {
  const [shouldImport, setShouldImport] = useState(true);
  const [progressMessage, setProgressMessage] = useState(
    "Waiting for page load",
  );
  const [progressNumerator, setProgressNumerator] = useState(0);
  const [progressDenominator, setProgressDenominator] = useState(0);
  const updatingProfileTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Because React state updates are asynchronous, the call to incrementProgressNumerator
    // could overwrite the "update profile" message. Thus, we need this effect to ensure it gets displayed.
    // The timer is needed so that it doesn't overwrite the "Successfully imported courses" message.
    const lastMessage = `Processing course ${getRelevantRowCount()}/${getRelevantRowCount()}`;
    if (progressMessage === "Successfully imported courses.") {
      clearTimeout(updatingProfileTimerRef.current ?? undefined);
    }
    if (progressMessage === lastMessage) {
      updatingProfileTimerRef.current = setTimeout(() => {
        setProgressMessage("Updating profile...");
      }, 200);
    }
  }, [progressNumerator]);

  useEffect(() => {
    let lastTableCount = 0;
    let tableCountStable = false;

    const tableCountInterval = setInterval(() => {
      const tableCount = document.querySelectorAll("table").length;
      if (tableCount === lastTableCount && tableCount > 0) {
        if (tableCountStable) {
          clearInterval(tableCountInterval);
          const totalRows = getRelevantRowCount();
          const totalProgress =
            totalRows + Math.max(1, Math.floor(totalRows / 10)); // Account for the backend processing time.
          setProgressDenominator(totalProgress);
          setProgressMessage(`Processing course 0/${totalRows}`);
          processAllTables(() => incrementProgressNumerator(totalRows)).then(
            (error) => {
              if (error) {
                setProgressMessage(error);
                sendResponse(error);
              } else {
                setProgressNumerator(totalProgress);
                setProgressMessage("Successfully imported courses.");
                sendResponse("Successfully imported courses.");
                setTimeout(() => {
                  setShouldImport(false);
                }, 1000);
              }
            },
          );
        } else {
          tableCountStable = true;
        }
      } else {
        tableCountStable = false;
      }
      lastTableCount = tableCount;
    }, 100);
  }, []);

  function incrementProgressNumerator(totalRows: number) {
    setProgressNumerator((prev) => {
      const newValue = prev + 1;
      setProgressMessage(`Processing course ${newValue}/${totalRows}`);
      return newValue;
    });
  }

  return (
    <Fade appear={false} in={shouldImport} timeout={2000}>
      <div>
        <ProgressCard
          title={"Importing courses"}
          progressMessage={progressMessage}
          progressNumerator={progressNumerator}
          progressDenominator={progressDenominator}
        />
      </div>
    </Fade>
  );
}

function getRelevantRowCount() {
  return (
    getScuTables().reduce((acc, table) => {
      return acc + table.querySelectorAll("tbody > tr").length - 1; // Subtract 1 to account for the total row
    }, 0) +
    getNonScuTables().reduce((acc, table) => {
      return acc + table.querySelectorAll("tbody > tr").length;
    }, 0)
  );
}

function getScuTables() {
  return Array.from(
    document.querySelectorAll(
      "table > caption",
    ) as NodeListOf<HTMLTableCaptionElement>,
  )
    .filter((caption) => caption.innerText === "Enrollments")
    .map((caption) => caption.parentElement! as HTMLTableElement);
}

function getNonScuTables() {
  return Array.from(document.querySelectorAll("table"))
    .filter(
      (table) => table.querySelector("caption")?.innerText !== "Enrollments",
    )
    .map((caption) => caption.parentElement! as HTMLTableElement);
}

function getAcademicPeriods() {
  return selectAllByTextContent<HTMLLabelElement>(
    document,
    "label",
    "Academic Period",
  ).map((el) => el.parentElement!.nextElementSibling! as HTMLElement);
}

function findIndexOfFirstQuarterBeforeFall2023(academicPeriods: HTMLElement[]) {
  // Find the index of the first quarter that occured before Fall 2023 (usually Spring 2023).
  return academicPeriods.findIndex((el) => {
    const match = el.innerText.match(ACADEMIC_PERIOD_PATTERN);
    return (
      match &&
      ((match[1] !== "Fall" && parseInt(match[2]) == 2023) ||
        parseInt(match[2]) < 2023)
    );
  });
}

async function processAllTables(incrementProgressNumerator: () => void) {
  const results: CourseData[] = [];
  const scuTables = getScuTables();
  const academicPeriods = getAcademicPeriods();
  const nonScuTables = getNonScuTables();
  let indexOfSpring2023 =
    findIndexOfFirstQuarterBeforeFall2023(academicPeriods);
  if (indexOfSpring2023 === -1) {
    indexOfSpring2023 = academicPeriods.length;
  }

  const tablesAfterSpring2023 = scuTables.slice(0, indexOfSpring2023);
  const tablesBeforeAndIncludingSpring2023 = scuTables.slice(indexOfSpring2023);

  const relatedActionsButtons: HTMLElement[] = [];
  for (const table of tablesAfterSpring2023) {
    const buttonList = table.querySelectorAll(
      '[aria-label="Related Actions"]',
    ) as NodeListOf<HTMLElement>;
    relatedActionsButtons.push(...Array.from(buttonList));
  }
  for (let i = 0; i < relatedActionsButtons.length; i++) {
    await processRelatedActionsButton(relatedActionsButtons[i], results);
    incrementProgressNumerator();
  }
  for (let i = 0; i < tablesBeforeAndIncludingSpring2023.length; i++) {
    const academicPeriod =
      academicPeriods[i + indexOfSpring2023].innerText.trim();
    processTable(
      tablesBeforeAndIncludingSpring2023[i],
      academicPeriod,
      results,
      incrementProgressNumerator,
    );
  }
  for (const table of nonScuTables) {
    processTable(
      table,
      "Not taken at SCU",
      results,
      incrementProgressNumerator,
      false,
    );
  }
  return await updateUserCourseData(results);
}

async function processRelatedActionsButton(
  button: HTMLElement,
  results: CourseData[],
) {
  const mouseDownEvent = new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  button.dispatchEvent(mouseDownEvent);
  await waitForSelector(".wd-popup");
  const popup = document.querySelector(".wd-popup") as HTMLElement;
  await waitForSelector("table", popup);
  if (popup) {
    const table = popup.querySelector("table")!;
    const cells = table.querySelectorAll("td");
    const courseName = cells[0].innerText.trim();
    let professor = cells[5].innerText.trim();
    const profIndexOfPipe = professor.indexOf("|");
    if (profIndexOfPipe !== -1) {
      professor = professor.substring(0, profIndexOfPipe).trim();
    }
    professor = professor.replace("\n\n\n", " & ");
    const academicPeriodEl = selectByTextContent<HTMLLabelElement>(
      popup,
      "label",
      "Academic Period",
    );
    const academicPeriod =
      academicPeriodEl!.parentElement!.nextElementSibling!.textContent!.trim();
    const match = academicPeriod.match(ACADEMIC_PERIOD_PATTERN);
    if (!match) {
      console.error(
        `Error: Could not parse academic period: ${academicPeriod}`,
      );
    }

    results.push({
      courseName,
      professor,
      academicPeriod: match ? `${match[1]} ${match[2]}` : academicPeriod,
    });
  }
  const closeButton = document.querySelector(
    "[data-automation-id='closeButton']",
  );
  if (closeButton) {
    (closeButton as HTMLElement).click();
    await waitForSelectorGone(".wd-popup");
  }
}

async function processTable(
  table: HTMLTableElement,
  academicPeriod: string,
  results: CourseData[] = [],
  incrementProgressNumerator: () => void,
  takenAtSCU = true,
) {
  const rows = Array.from(
    table.querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>,
  );
  if (takenAtSCU) {
    rows.pop(); // Remove last row which is a total row.
  }
  const match = academicPeriod.match(ACADEMIC_PERIOD_PATTERN);
  academicPeriod = match ? `${match[1]} ${match[2]}` : academicPeriod;
  for (const row of rows) {
    const tds = row.querySelectorAll("td");
    results.push({
      courseName: tds[1].innerText.trim(),
      professor: takenAtSCU ? "" : "Not taken at SCU",
      academicPeriod,
    });
    incrementProgressNumerator();
  }
}
