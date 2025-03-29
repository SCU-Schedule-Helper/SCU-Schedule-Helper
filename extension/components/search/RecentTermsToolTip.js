import React from "react";
import { Tooltip } from "@mui/material";

export default function RecentTermsToolTip({ recentTerms, children }) {
  function cleanYearsAndTerms(recentTerms) {
    const termPattern = /(Spring|Summer|Fall|Winter)/i;
    const yearPattern = /\d{4}/;
    const result = {};

    recentTerms.forEach((term) => {
      const termMatch = term.match(termPattern);
      const yearMatch = term.match(yearPattern);

      if (termMatch && yearMatch) {
        const termName = termMatch[0];
        const year = yearMatch[0];

        if (!result[termName]) {
          result[termName] = [];
        }

        result[termName].push(year);
      }
    });

    return Object.entries(result).map(([term, years]) => (
      <div key={term} style={{ fontSize: "0.875rem", lineHeight: "1.25rem" }}>
        <strong>{term}:</strong> {years.join(", ")}
      </div>
    ));
  }

  return (
    <Tooltip
      title={<div>{cleanYearsAndTerms(recentTerms)}</div>}
      placement="bottom-start"
      PopperProps={{
        sx: {
          "& .MuiTooltip-tooltip": {
            backgroundColor: "white",
            color: "black",
            border: "1px solid #ddd",
            maxWidth: "380px",
            padding: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          },
        },
      }}
    >
      {children}
    </Tooltip>
  );
}
