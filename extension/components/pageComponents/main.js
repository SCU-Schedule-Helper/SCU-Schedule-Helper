import { useRef, useState, useEffect } from "react";
import { Box } from "@mui/material";
import ProfCourseSearch from "../queryComponents/ProfCourseSearch";
import AuthWrapper from "./authWrapper";
import QueryDialog from "../queryComponents/QueryDialog";
import QueryPageTitle from "../queryComponents/QueryTitlePage";

export default function Main({ }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const boxRef = useRef(null);
  const [query, setSelected] = useState(null);
  const [stack, setStack] = useState([]);

  useEffect(() => {
    if (query !== null) {
      setStack(prevStack => {
        if (prevStack[prevStack.length - 1] !== query) {
          const newStack = [...prevStack, query];
          return newStack;
        }
        return prevStack;
      });
    }
  }, [query]);

  function scrollToTop() {
    if (boxRef.current) {
      boxRef.current.parentElement.scrollTo(0, 0);
    }
  }

  function handleDialogOpen() {
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false); seEffect(() => {
      if (query !== null) {
        setStack(prevStack => {
          if (prevStack[prevStack.length - 1] !== query) {
            const newStack = [...prevStack, query];
            return newStack;
          }
          return prevStack;
        });
      }
    }, [query]);
  }

  function handleBackButton() {
    setStack(prevStack => {
      const newStack = [...prevStack];
      newStack.pop();
      if (newStack.length === 0) {
        setSelected(null);
      } else {
        setSelected(newStack[newStack.length - 1]);
      }
      return newStack;
    });
  }

  function onQueryChange(query) {
    setSelected(query);
  }


  return (
    <AuthWrapper>
      <Box ref={boxRef} sx={{ padding: 2, overflow: "auto", pb: 0 }}>
        <Box
          sx={{
            mb: 3,
            flexDirection: "column",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <QueryPageTitle handleBackButton={handleBackButton} handleDialogOpen={handleDialogOpen} stack={stack} />
          <Box sx={{ width: "100%", maxWidth: "420px" }}>
            <ProfCourseSearch
              scrollToTop={scrollToTop}
              query={query}
              onQueryChange={onQueryChange}
            />
          </Box>
        </Box>
      </Box>
      <QueryDialog open={dialogOpen} onClose={handleDialogClose} />
    </AuthWrapper>
  );
}