import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CurrentCourseImporter from "../components/current_courses/CurrentCourseImporter";

let messageReceived = false;
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message !== "importCurrentCourses" || messageReceived) {
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
    <StrictMode>
      <CurrentCourseImporter sendResponse={sendResponse} />
    </StrictMode>,
  );
  return true;
});
