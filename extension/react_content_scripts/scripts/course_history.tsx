import React from "react";
import { createRoot } from "react-dom/client";
import CourseHistoryImporter from "../components/course_history/CourseHistoryImporter.tsx";

let messageReceived = false;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message !== "importCourseHistory" || messageReceived) {
    return false;
  }
  messageReceived = true;
  const courseImporter = document.createElement("div");
  courseImporter.id = "root";

  courseImporter.style.position = "fixed";
  courseImporter.style.top = "3rem";
  courseImporter.style.right = "3rem";
  courseImporter.style.zIndex = "9999";

  document.body.prepend(courseImporter);

  const root = createRoot(courseImporter);

  root.render(
    <React.StrictMode>
      <CourseHistoryImporter sendResponse={sendResponse} />
    </React.StrictMode>,
  );
  return true;
});
