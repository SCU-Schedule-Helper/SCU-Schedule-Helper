// Automatically tracks courses and sections that the user is interested in, if feature is enabled.
let debounceTimer: number;
const debounceDelay: number = 100;
const expDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 45);
const sentInterestedSections = new Set();
const checkForInterestedSections = function (): void {
  // Clear the previous debounce timer
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    const element = document.querySelector(
      '[data-automation-id="pageHeaderTitleText"]',
    );
    if (
      element?.textContent === "Add Course Section to Saved Schedule" ||
      element?.textContent === "Add Course Sections to Saved Schedule"
    ) {
      const tables = document.querySelectorAll("table");
      if (tables.length !== 1) return;
      const table = tables[0]!;
      const data = table.querySelectorAll("td");
      const add: Record<string, string> = {};
      let curSection: string | null = null;
      let curProf: string | null = null;
      let curMeetingPatterns: string | null = null;
      for (let i = 0; i < data.length; i++) {
        if (i % 10 === 3) {
          curSection = data[i]!.innerText;
        }
        if (i % 10 === 6) {
          curProf = data[i]!.innerText;
          const profIndexOfPipe = curProf.indexOf("|");
          if (profIndexOfPipe !== -1) {
            // Removes the preferred name.
            curProf = curProf.slice(0, profIndexOfPipe).trim();
          }
          curProf = curProf.replace("\n\n\n", " & ");
        }
        if (i % 10 === 9) {
          curMeetingPatterns = data[i]!.innerText;
          if (curSection && curProf && curMeetingPatterns) {
            const interestedSectionString = `P{${curProf}}S{${curSection}}M{${curMeetingPatterns}}`;
            if (!sentInterestedSections.has(interestedSectionString)) {
              sentInterestedSections.add(interestedSectionString);
              add[interestedSectionString] = expDate.toISOString();
            }
          }
          curSection = null;
          curProf = null;
          curMeetingPatterns = null;
        }
      }
      if (Object.keys(add).length === 0) return;
      // Expires in 1.5 months from now
      const message = {
        type: "updateUser",
        updateItems: {
          interestedSections: {
            add,
          },
        },
      };
      chrome.runtime.sendMessage(message).then((response) => {
        if (response && !response.ok)
          console.error(
            `Error updating interested sections: ${response.message}`,
          );
      });
    }
  }, debounceDelay);
};

chrome.storage.local.get("userInfo", (data: any) => {
  if (
    data.userInfo &&
    data.userInfo.id && // User must be logged in
    data.userInfo.preferences &&
    data.userInfo.preferences.courseTracking
  ) {
    const targetNode: Node = document.body;
    const config: MutationObserverInit = { childList: true, subtree: true };
    const observer = new MutationObserver(checkForInterestedSections);
    observer.observe(targetNode, config);
  }
});
