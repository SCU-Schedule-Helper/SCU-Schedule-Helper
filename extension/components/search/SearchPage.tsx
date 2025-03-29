import { useRef, useState, useEffect, ReactElement } from "react";
import { Box } from "@mui/material";
import ProfCourseSearch from "./ProfCourseSearch";
import AuthWrapper from "../utils/AuthWrapper";
import QueryDialog from "./QueryDialog";
import QueryPageTitle from "./QueryTitlePage";

export default function SearchPage({}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const boxRef = useRef(null as HTMLElement | null);
  const [query, setQuery] = useState(null as string | null);
  const [stack, setStack] = useState([] as string[]);

  useEffect(() => {
    if (query !== null) {
      setStack((prevStack) => {
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
      boxRef.current?.parentElement?.scrollTo(0, 0);
    }
  }

  function handleDialogOpen() {
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    useEffect(() => {
      if (query !== null) {
        setStack((prevStack) => {
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
    setStack((prevStack) => {
      const newStack = [...prevStack];
      newStack.pop();
      if (newStack.length === 0) {
        setQuery(null);
      } else {
        setQuery(newStack[newStack.length - 1]);
      }
      return newStack;
    });
  }

  function onQueryChange(query: string) {
    setQuery(query);
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
          <QueryPageTitle
            handleBackButton={handleBackButton}
            handleDialogOpen={handleDialogOpen}
            showBackButton={stack.length === 0}
          />
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
