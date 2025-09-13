import { useRef, useState, useEffect } from "react";
import { Box } from "@mui/material";
import ProfCourseSearch from "./ProfCourseSearch";
import { SelectedProfOrCourse } from "./ProfCourseCard";
import AuthWrapper from "../utils/AuthWrapper";
import QueryDialog from "./QueryDialog";
import QueryTitlePage from "./QueryTitlePage";

export default function SearchPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const boxRef = useRef<HTMLElement | null>(null);
  const [stack, setStack] = useState<SelectedProfOrCourse[]>([]);
  // Selected item for ProfCourseSearch
  const [selectedProfessorOrCourse, setSelectedProfessorOrCourse] = useState<SelectedProfOrCourse | null>(null);

  useEffect(() => {
    if (selectedProfessorOrCourse !== null) {
      setStack((prevStack) => {
        if (prevStack[prevStack.length - 1] !== selectedProfessorOrCourse) {
          const newStack = [...prevStack, selectedProfessorOrCourse];
          return newStack;
        }
        return prevStack;
      });
    }
  }, [selectedProfessorOrCourse]);

  function scrollToTop() {
    if (boxRef.current) {
      boxRef.current?.parentElement?.scrollTo(0, 0);
    }
  }

  function handleDialogOpen() {
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
  }

  function handleBackButton() {
    setStack((prevStack) => {
      const newStack = [...prevStack];
      newStack.pop();
      if (newStack.length === 0) {
        setSelectedProfessorOrCourse(null);
      } else {
        setSelectedProfessorOrCourse(newStack[newStack.length - 1]!);
      }
      return newStack;
    });
  }

  return (
    <AuthWrapper>
      <Box ref={boxRef} sx={{ 
        padding: 2, 
        pb: 0,
        display: "flex",
        flexDirection: "column"
      }}>
        <Box
          sx={{
            mb: 3,
            flexDirection: "column",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexGrow: 1,
            minHeight: 0
          }}
        >
          <QueryTitlePage
            handleBackButton={handleBackButton}
            handleDialogOpen={handleDialogOpen}
            showBackButton={stack.length === 0}
          />
          <Box sx={{ width: "100%", maxWidth: "100%", flexGrow: 1, minHeight: 0 }}>
            <ProfCourseSearch
              scrollToTop={scrollToTop}
              selectedProfessorOrCourse={selectedProfessorOrCourse}
              onSelectionChange={setSelectedProfessorOrCourse}
            />
          </Box>
        </Box>
      </Box>
      <QueryDialog open={dialogOpen} onClose={handleDialogClose} />
    </AuthWrapper>
  );
}
