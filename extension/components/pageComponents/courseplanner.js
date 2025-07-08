import React, { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ImportContactsIcon from "@mui/icons-material/ImportContacts";
import * as XLSX from "xlsx";

function ImportAcademicProgressTable({ data }) {
  return (
    <Box sx={{ mt: 4, width: "100%", maxWidth: 500 }}>
      <h3>Academic Progress</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Requirement</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{row[0]}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

export default function CoursePlannerPage() {
  const fileInputRef = useRef();
  const [unsatisfiedRequirements, setUnsatisfiedRequirements] = useState([]);

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
        setUnsatisfiedRequirements(unsatisfied);
      } catch (err) {
        console.error("Error reading Excel file:", err);
        alert("There was a problem reading your Excel file. Please make sure it is a valid .xlsx file and try again.\n\nError: " + err.message);
        setUnsatisfiedRequirements([]);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = null;
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        height: "100%",
        padding: 3,
        textAlign: "center",
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
            backgroundColor: "#703331",
            color: "white",
            fontWeight: "bold",
            borderRadius: 2,
            textTransform: "none",
            boxShadow: "0 2px 6px rgba(112, 51, 49, 0.15)",
            ":hover": {
              backgroundColor: "#8a443d",
            },
            minWidth: 220,
            fontSize: "1rem",
            py: 1.2,
          }}
        >
          Upload Excel Academic Progress
        </Button>
      </Box>
      {/* Display unsatisfied requirements */}
      {unsatisfiedRequirements.length > 0 && (
        <Box sx={{ mt: 4, width: "100%", maxWidth: 500 }}>
          <h3>Unsatisfied Requirements</h3>
          <ul style={{ textAlign: "left" }}>
            {unsatisfiedRequirements.map((req, idx) => (
              <li key={idx}>{req}</li>
            ))}
          </ul>
        </Box>
      )}
    </Box>
  );
} 