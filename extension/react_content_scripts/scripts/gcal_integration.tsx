/// <reference lib="webworker" />
import { createRoot } from "react-dom/client";
import GoogleCalendarButton from "../components/gcal_integration/GoogleCalendarButton.tsx";

const debounceDelay = 100;
let debounceTimer: any;

const isButtonAdded = () => {
  return !!document.getElementById("gcal-button-container");
};

const tryInjectingButton = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    if (isButtonAdded()) return;
    const titleElement = document.querySelector(
      '[data-automation-id="pageHeaderTitleText"]'
    );
    // Only inject on the "View My Courses" page
    if (!titleElement?.textContent?.includes("View My Courses")) return;
    const buttonBars = document.querySelectorAll(
      '[data-automation-id="buttonBar"]'
    );
    for (const buttonBar of buttonBars) {
      const panel = buttonBar.closest('[data-automation-id="panel"]');

      if (!buttonBar) {
        console.error("Button bar not found for panel: ", panel);
        return;
      }
      const buttonClassName = buttonBar.querySelector('li')?.className;
      if (!buttonClassName) {
        console.error("Button class name not found");
        return;
      }
      const newListItem = document.createElement("li");
      newListItem.className = "SCU-Schedule-Helper-Google-Calendar-Button ";
      newListItem.className += buttonClassName;
      newListItem.style.float = "right";
      const container = document.createElement("div");
      container.id = "gcal-button-container";
      newListItem.appendChild(container);
      buttonBar.insertBefore(newListItem, buttonBar.firstChild);
      const root = createRoot(container);
      root.render(<GoogleCalendarButton panel={panel!} />);
    }
  }, debounceDelay);
};

const observer = new MutationObserver(tryInjectingButton);

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
