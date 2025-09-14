/// <reference types="chrome"/>
export const ACADEMIC_PERIOD_PATTERN = /(Winter|Spring|Summer|Fall) (\d{4})/;

export interface CourseData {
  courseName: string;
  professor: string;
  academicPeriod: string;
}

export async function waitForSelector(
  selector: string,
  parentElement: Element | Document = document
) {
  return new Promise<HTMLElement>((resolve) => {
    const interval = setInterval(() => {
      const el = parentElement.querySelector(selector) as HTMLElement;
      if (el) {
        clearInterval(interval);
        resolve(el);
      }
    }, 10);
  });
}

export async function waitForSelectorGone(
  selector: string,
  parentElement: HTMLElement | Document = document
) {
  return new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const el = parentElement.querySelector(selector);
      if (!el) {
        clearInterval(interval);
        resolve();
      }
    }, 10);
  });
}

export function selectByTextContent<Type extends HTMLElement>(
  element: HTMLElement | Document,
  tag: string,
  text: string
) {
  return Array.from(element.querySelectorAll(tag) as NodeListOf<Type>).find(
    (el) => el.textContent?.trim() === text
  );
}

export function selectAllByTextContent<Type extends HTMLElement>(
  element: HTMLElement | Document,
  tag: string,
  text: string
) {
  return Array.from(element.querySelectorAll(tag) as NodeListOf<Type>).filter(
    (el) => el.textContent?.trim() === text
  );
}

export async function updateUserCourseData(results: CourseData[]) {
  const payload = {
    coursesTaken: {
      add: formatResults(results),
    },
  };

  try {
    const message = {
      type: "updateUser",
      updateItems: payload,
    };

    const putResponse = await chrome.runtime.sendMessage(message);
    if (putResponse && !putResponse.ok) {
      return putResponse.message;
    }
    return null;
  } catch (error) {
    console.error(
      "Error occurred while sending data to service worker:",
      error
    );
    return "An unknown error occurred while updating your profile. Please try again.";
  }
}

function formatResults(results: CourseData[]) {
  return results.map((entry) => {
    return `P{${entry.professor || ""}}C{${entry.courseName || ""}}T{${
      entry.academicPeriod || ""
    }}`;
  });
}

export function getEnrolledCoursesTables(rootElement: Element | Document = document): HTMLTableElement[] {
  return Array.from(
    rootElement.querySelectorAll(
      "table > caption"
    ) as NodeListOf<HTMLTableCaptionElement>
  )
    .filter((caption) => caption.innerText === "My Enrolled Courses")
    .map((caption) => caption.parentElement as HTMLTableElement);
}
