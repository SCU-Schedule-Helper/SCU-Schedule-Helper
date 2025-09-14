import { MouseEvent, useEffect, useState } from "react";
import {
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Avatar,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  AlertColor,
} from "@mui/material";
import { ExpandMore, Close } from "@mui/icons-material";
import CourseDetailsCard from "../utils/CourseDetailsCard";
import {
  parseInterestedSections,
  parseTakenCourses,
} from "../utils/user";
import {
  FriendProfile,
  ParsedCourseTaken,
  ParsedInterestedSection
} from "../../public/utils/types";

interface TransformedFriendProfile {
  id: string;
  email: string;
  name: string;
  photoUrl: string;
  interestedSections: { [key: string]: string };
  coursesTaken: string[];
  expanded: boolean;
  courses: {
    interested: ParsedInterestedSection[];
    taken: ParsedCourseTaken[];
  };
}

interface Props {
  friends: FriendProfile[];
  handleActionCompleted: (action: string, type: AlertColor) => void;
}

export default function FriendsAccordion({
  friends = [],
  handleActionCompleted = (_action: string, _type: AlertColor) => { },
}: Props) {
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<string | null>(null);
  const [transformedFriends, setTransformedFriends] = useState<TransformedFriendProfile[]>([]);
  const [friendsExpanded, setFriendsExpanded] = useState(false);

  useEffect(() => {
    const transformedFriends = friends.map((profile) => {
      return {
        ...profile,
        expanded: false,
        courses: {
          interested: parseInterestedSections(profile.interestedSections),
          taken: parseTakenCourses(profile.coursesTaken),
        },
      };
    });
    setTransformedFriends(transformedFriends);
  }, [friends]);

  function handleRemoveFriendClick(
    event: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>,
    id: string
  ) {
    event.stopPropagation();
    setFriendToRemove(id);
    setOpenConfirmDialog(true);
  }

  async function handleConfirmRemoveFriend() {
    if (friendToRemove) {
      try {
        const updateResponse = await chrome.runtime.sendMessage({
          type: "updateUser",
          updateItems: {
            friends: {
              remove: [friendToRemove],
            },
          },
        });
        if (updateResponse && !updateResponse.ok) {
          handleActionCompleted(updateResponse.message, "error");
        } else {
          handleActionCompleted("Friend removed.", "success");
        }
        setOpenConfirmDialog(false);
        setFriendToRemove(null);
      } catch (error) {
        console.error("Error removing friend:", error);
      }
    }
  }

  function handleCancelRemoveFriend() {
    setOpenConfirmDialog(false);
    setFriendToRemove(null);
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: "1.25rem" }}>
        Friends {`(${friends.length})`}
      </Typography>
      <Accordion
        slotProps={{ transition: { unmountOnExit: true } }}
        defaultExpanded={friends.length > 0}
        expanded={friendsExpanded}
        onChange={(_event, expanded) => setFriendsExpanded(expanded)}
        disableGutters
        square
        sx={{
          "&:before": {
            display: "none",
          },
          "&:not(:last-child)": {
            borderBottom: 0,
          },
          mb: 2,
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="friends-list-content"
          id="friends-list-header"
          sx={{
            flexDirection: "row-reverse",
            "& .MuiAccordionSummary-content": {
              marginLeft: 2,
            },
          }}
        >
          <Typography variant="h6" sx={{ fontSize: "1rem" }}>
            Friends
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {transformedFriends.map((friend) => (
            <Accordion
              slotProps={{ transition: { unmountOnExit: true } }}
              key={friend.id}
              sx={{
                mb: 1,
                "&:before": {
                  display: "none",
                },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls={`panel${friend.id}-content`}
                id={`panel${friend.id}-header`}
                sx={{
                  "& .MuiAccordionSummary-content, & .MuiAccordionSummary-content.Mui-expanded":
                  {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mr: 1,
                  },
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ width: "100%" }}
                >
                  <Avatar
                    src={friend.photoUrl}
                    alt={friend.name}
                    sx={{ width: 40, height: 40 }}
                  />
                  <Typography sx={{ flexGrow: 1 }}>{friend.name}</Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleRemoveFriendClick(e, friend.id)}
                    sx={{
                      color: "error.main",
                      "&:hover": {
                        backgroundColor: "error.light",
                        color: "white",
                      },
                    }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Stack>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  p: 2,
                  overflow: "auto",
                  maxHeight: "14rem",
                  boxSizing: "border-box",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Email: {friend.email || `${friend.id}@scu.edu`}
                  </Typography>
                  <CourseDetailsCard courses={friend.courses} />
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </AccordionDetails>
      </Accordion>

      <Dialog
        open={openConfirmDialog}
        onClose={handleCancelRemoveFriend}
        aria-labelledby="remove-friend-dialog-title"
        aria-describedby="remove-friend-dialog-description"
      >
        <DialogTitle id="remove-friend-dialog-title">Remove Friend</DialogTitle>
        <DialogContent>
          <DialogContentText id="remove-friend-dialog-description">
            Are you sure you want to remove this friend?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemoveFriend} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRemoveFriend}
            color="error"
            variant="contained"
            autoFocus
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
