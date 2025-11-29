import { Page } from "puppeteer";
import type { ProfessorRating } from "./types";
import { pageInstance } from ".";



async function clickLoadMoreUntilDone(page: Page, debuggingEnabled = false) {
  if (debuggingEnabled) console.log("Attempting to click 'Load More' button...");
  while (true) {
    try {
      await page.waitForSelector(`[class*="PaginationButton__StyledPaginationButton"]`, { timeout: 2000 });
    } catch {
      break;
    }
    const button = await page.$(`[class*="PaginationButton__StyledPaginationButton"]`);
    if (!button) break;

    try {
      await button.click();
    } catch {
      break;
    }
  }
  if (debuggingEnabled) console.log("No more 'Load More' button found, proceeding...");
}

function parseNumberOrNA(text: string | null): number | "N/A" {
  if (!text) return "N/A";
  const trimmed = text.trim();
  const value = Number(trimmed);
  return Number.isNaN(value) ? "N/A" : value;
}

function parseBoolOrNA(text: string | null): boolean | "N/A" {
  if (!text) return "N/A";
  const t = text.trim().toLowerCase();
  if (t === "yes") return true;
  if (t === "no") return false;
  return "N/A";
}

function parseDateToISO(dateText: string | null): string {
  if (!dateText) return "";
  // RMP dates look like "Nov 26th, 2025"
  const cleaned = dateText.replace(/(\d+)(st|nd|rd|th)/, "$1");
  const d = new Date(cleaned);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function scrapeProfessor(url: string, debuggingEnabled = false): Promise<ProfessorRating> {
  const page = pageInstance!;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Ensure all ratings are loaded
  await clickLoadMoreUntilDone(page, debuggingEnabled);

  // Adjust these selectors if RMP changes layout.
  const profName = await page.$eval("h1", el => el.textContent?.trim() || "");
  if (!profName) {
    throw new Error(`Professor name not found on ${url}, page structure may have changed.`);
  }

  const totalRatingsText = await page.$eval(`a[href="#ratingsList"]`, el => el.textContent?.trim().replace(/[^0-9]/g, "") || "").catch(() => "");

  const qualityRatingText = await page.$eval(
    `[class*="RatingValue__Numerator"]`,
    el => el.textContent?.trim() || ""
  ).catch(() => "");


  const els = await page.$$(`[class*="FeedbackItem__FeedbackNumber"]`);

  const wouldTakeAgainText = await els[0]?.evaluate(el => el.textContent?.trim() || "") ?? "";

  const difficultyRatingText = await els[1]?.evaluate(el => el.textContent?.trim() || "") ?? "";



  const topTags = await page.$$eval(
    `[class*="TeacherTags"] > span[class*="Tag"]`,
    els => els.map(el => el.textContent?.trim()).filter(Boolean) as string[]
  ).catch(() => []);

  const studentRatings = await page.$$eval(
    // Each rating card container
    `[class*="Rating__StyledRating"]`,
    cards => {
      const results: any[] = [];

      for (const card of cards as HTMLElement[]) {
        const getText = (selector: string) =>
          (card.querySelector(selector)?.textContent || "").trim();

        const qualityText = getText(`[class*="RatingValues__RatingContainer"]:nth-of-type(1) [class*='CardNumRating__CardNumRatingNumber']`);
        const difficultyText = getText(`[class*="RatingValues__RatingContainer"]:nth-of-type(2) [class*='CardNumRating__CardNumRatingNumber']`);

        const courseCode = getText(`[class*="Rating__RatingInfo"] [class*="RatingHeader__StyledClass"]`);
        const dateText = getText(`[class*="RatingHeader__RatingTimeStamp"]`);

        // Attributes like "For Credit : Yes"
        const forCreditLine = Array.from(card.querySelectorAll(`[class*="MetaItem__StyledMetaItem"]`))
          .map(el => el.textContent?.trim() || "")
          .find(t => t.startsWith("For Credit"));
        const attendanceLine = Array.from(card.querySelectorAll(`[class*="MetaItem__StyledMetaItem"]`))
          .map(el => el.textContent?.trim() || "")
          .find(t => t.startsWith("Attendance"));
        const wouldTakeAgainLine = Array.from(card.querySelectorAll(`[class*="MetaItem__StyledMetaItem"]`))
          .map(el => el.textContent?.trim() || "")
          .find(t => t.startsWith("Would Take Again"));
        const gradeLine = Array.from(card.querySelectorAll(`[class*="MetaItem__StyledMetaItem"]`))
          .map(el => el.textContent?.trim() || "")
          .find(t => t.startsWith("Grade"));
        const textbookLine = Array.from(card.querySelectorAll(`[class*="MetaItem__StyledMetaItem"]`))
          .map(el => el.textContent?.trim() || "")
          .find(t => t.startsWith("Textbook"));

        const extractValue = (line: string | undefined) => {
          if (!line) return "";
          const parts = line.split(":");
          return (parts[1] || "").trim();
        };

        const comment = (card.querySelector(`[class*="Comments__StyledComments"]`)?.textContent || "").trim();

        const tagsGiven = Array.from(
          card.querySelectorAll(`[class*="RatingTags__StyledTags"]>[class*="Tag"]`)
        )
          .map(el => el.textContent?.trim() || "");

        const likesText = card.querySelector(`#thumbs_up > [class*="Thumbs__HelpTotalNumber"]`)?.textContent?.trim() || "0";
        const dislikesText = card.querySelector(`#thumbs_down > [class*="Thumbs__HelpTotalNumber"]`)?.textContent?.trim() || "0";

        results.push({
          courseCode,
          date: dateText,
          qualityRatingText: qualityText,
          difficultyRatingText: difficultyText,
          forCreditText: extractValue(forCreditLine),
          attendanceText: extractValue(attendanceLine),
          gradeText: extractValue(gradeLine),
          wouldTakeAgainText: extractValue(wouldTakeAgainLine),
          textbookText: extractValue(textbookLine),
          comment,
          tagsGiven,
          likesText,
          dislikesText
        });
      }

      return results;
    }
  ).catch(() => []);

  const normalized: ProfessorRating = {
    profName,
    qualityRating: parseNumberOrNA(qualityRatingText),
    difficultyRating: parseNumberOrNA(difficultyRatingText),
    totalRatings: parseNumberOrNA(totalRatingsText),
    wouldTakeAgainPercent: (() => {
      if (!wouldTakeAgainText) return "N/A";
      const m = wouldTakeAgainText.match(/(\d+)%/);
      return m ? Number(m[1]) : "N/A";
    })(),
    topTags,
    studentRatings: studentRatings.map(r => ({
      courseCode: r.courseCode,
      date: parseDateToISO(r.date),
      qualityRating: parseNumberOrNA(r.qualityRatingText),
      difficultyRating: parseNumberOrNA(r.difficultyRatingText),
      forCredit: parseBoolOrNA(r.forCreditText),
      attendance: parseBoolOrNA(r.attendanceText),
      textbookRequired: parseBoolOrNA(r.textbookText),
      gradeReceived: r.gradeText || "",
      wouldTakeAgain: r.wouldTakeAgainText || "",
      tagsGiven: r.tagsGiven,
      comment: r.comment,
      likes: Number(r.likesText) || 0,
      dislikes: Number(r.dislikesText) || 0
    }))
  };

  return normalized;
}
