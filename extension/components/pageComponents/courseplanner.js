import React, { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import * as XLSX from "xlsx";

export default function CoursePlannerPage() {
  const fileInputRef = useRef();
  const [unsatisfiedRequirements, setUnsatisfiedRequirements] = useState([]);
  const [nextQuarterRequirements, setNextQuarterRequirements] = useState([]);

  const handleExcelUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    // Check extension and MIME type
    const validExt = file.name.endsWith('.xlsx');
    const validMime = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (!validExt || !validMime) {
      alert('Please upload a valid .xlsx Excel file (not .xls, .csv, or other types).');
      event.target.value = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target.result);
      // Check ZIP signature for .xlsx (PK\x03\x04)
      if (!(arr[0] === 0x50 && arr[1] === 0x4B && arr[2] === 0x03 && arr[3] === 0x04)) {
        alert('File is not a valid .xlsx Excel file (bad file signature). Please re-save your file in Excel and try again.');
        setUnsatisfiedRequirements([]);
        return;
      }
      try {
        const workbook = XLSX.read(arr, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        // rows: [ [Requirement, Status], ... ]
        const unsatisfied = rows
          .filter(row => row[1] && row[1].toString().trim().toLowerCase() === "not satisfied")
          .map(row => row[0]);
        console.log("Found unsatisfied requirements:", unsatisfied);
        setUnsatisfiedRequirements(unsatisfied);
        setNextQuarterRequirements([]); // Reset next quarter when new file is uploaded
        console.log("State updated - unsatisfied count:", unsatisfied.length);
      } catch (err) {
        console.error("Error reading Excel file:", err);
        alert("There was a problem reading your Excel file. Please make sure it is a valid .xlsx file and try again.\n\nError: " + err.message);
        setUnsatisfiedRequirements([]);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = null;
  };

  const handleDragStart = (e, requirement) => {
    console.log("Drag started for:", requirement);
    e.dataTransfer.setData("text/plain", requirement);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetList) => {
    e.preventDefault();
    const requirement = e.dataTransfer.getData("text/plain");
    console.log("Drop event - requirement:", requirement, "target:", targetList);
    
    if (targetList === "nextQuarter") {
      // Move from unsatisfied to next quarter
      console.log("Moving from unsatisfied to next quarter");
      setUnsatisfiedRequirements(prev => {
        const newList = prev.filter(req => req !== requirement);
        console.log("Updated unsatisfied list:", newList);
        return newList;
      });
      setNextQuarterRequirements(prev => {
        const newList = [...prev, requirement];
        console.log("Updated next quarter list:", newList);
        return newList;
      });
    } else if (targetList === "coursesFromNextQuarter") {
      // Move from next quarter to courses from next quarter box
      console.log("Moving from next quarter to courses box");
      setNextQuarterRequirements(prev => prev.filter(req => req !== requirement));
      // This would add to a new state, but for now we'll just move it back to unsatisfied
      setUnsatisfiedRequirements(prev => [...prev, requirement]);
    } else if (targetList === "unsatisfied") {
      // Move from next quarter back to unsatisfied
      console.log("Moving from next quarter back to unsatisfied");
      setNextQuarterRequirements(prev => prev.filter(req => req !== requirement));
      setUnsatisfiedRequirements(prev => [...prev, requirement]);
    }
  };

  const DraggableRequirement = ({ requirement, source }) => (
    <Box
      draggable
      onDragStart={(e) => handleDragStart(e, requirement)}
      sx={{
        backgroundColor: "#f5f5f5",
        border: "1px solid #ddd",
        borderRadius: "4px",
        padding: "8px 12px",
        margin: "4px 0",
        cursor: "grab",
        "&:hover": {
          backgroundColor: "#e8e8e8",
        },
        "&:active": {
          cursor: "grabbing",
        },
      }}
    >
      {requirement}
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh", // Allow growing with content
        padding: 0, // Remove padding to make divider touch top and bottom
      }}
    >
      {/* Left half */}
      <Box
        sx={{
          width: "50%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: 2,
          paddingRight: 3, // Extra padding for scrollbar
          borderRight: "1px solid #ccc",
          gap: 3,
          height: "100%", // Full height
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<UploadFileIcon />}
            onClick={handleExcelUploadClick}
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": { backgroundColor: "#671f1a" },
              py: 0.2, // Further reduced for shorter button
              fontSize: "0.75rem", // Smaller text size
            }}
          >
            Upload Excel Academic Progress
          </Button>
        </Box>
        
        {/* Unsatisfied Requirements Box */}
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <h3>Unsatisfied Requirements</h3>
          <Box
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "unsatisfied")}
            sx={{
              minHeight: "150px",
              border: "2px dashed #ccc",
              borderRadius: "8px",
              padding: "16px",
              backgroundColor: "#f8e6e6", // Lighter version of #802a25
              display: "flex",
              flexDirection: "column",
              gap: 1,
              margin: "0 auto",
              maxWidth: "350px",
            }}
          >
            {unsatisfiedRequirements.length === 0 ? (
              <Box sx={{ color: "#999", textAlign: "center", marginTop: "50px" }}>
                Upload Excel file to see unsatisfied requirements
              </Box>
            ) : (
              unsatisfiedRequirements.map((req, idx) => (
                <DraggableRequirement key={idx} requirement={req} source="unsatisfied" />
              ))
            )}
          </Box>
        </Box>
      </Box>
      {/* Right half */}
      <Box
        sx={{
          width: "50%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: 2,
          paddingRight: 8, // Increased from 3 to 8 for much more spacing
          height: "100%", // Full height
          gap: 2,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            // Add your generate quarter plan logic here
            console.log("Generate quarter plan clicked");
          }}
          sx={{
            backgroundColor: "#802a25",
            color: "white",
            "&:hover": { backgroundColor: "#671f1a" },
            py: 0.2, // Same as upload button
            fontSize: "0.75rem", // Same as upload button
          }}
        >
          Generate Quarter Plan
        </Button>
        <h3>Next Quarter</h3>
        <Box
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "nextQuarter")}
          sx={{
            width: "100%",
            minHeight: "300px",
            border: "2px dashed #ccc",
            borderRadius: "8px",
            padding: "16px",
            paddingRight: "20px", // Extra right padding for more spacing
            backgroundColor: "#f0f8ff",
            display: "flex",
            flexDirection: "column",
            gap: 1,
            margin: "0 auto",
            maxWidth: "300px", // Reduced from 350px to 300px to create more space on the right
          }}
        >
          {nextQuarterRequirements.length === 0 ? (
            <Box sx={{ color: "#999", textAlign: "center", marginTop: "100px" }}>
              Drag unsatisfied requirements here
            </Box>
          ) : (
            nextQuarterRequirements.map((req, idx) => (
              <DraggableRequirement key={idx} requirement={req} source="nextQuarter" />
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}