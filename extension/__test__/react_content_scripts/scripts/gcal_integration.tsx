/// <reference lib="webworker" />
import React from "react";
import { createRoot } from "react-dom/client";
import GoogleCalendarButton from "../components/gcal_integration/GoogleCalendarButton";

const debounceDelay = 100;
let debounceTimer: null | number;

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
    const buttonBar = document.querySelector(
      'div.WM1N ul.WMIM[data-automation-id="buttonBar"]'
    );
    if (buttonBar) {
      console.log("Injecting Google Calendar button");
      const newListItem = document.createElement("li");
      newListItem.className = "WMIM";
      newListItem.id = "SCU-Schedule-Helper-Google-Calendar-Button";
      newListItem.style.float = "right";

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
      newListItem.className = buttonClassName;
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
