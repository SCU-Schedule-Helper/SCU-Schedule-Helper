import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Avatar,
  Stack,
  AlertColor,
} from "@mui/material";
import { ExpandMore, Check, Close } from "@mui/icons-material";
import { FriendRequest } from "../utils/types";

interface Props {
  requestsIn: FriendRequest[];
  requestsOut: FriendRequest[];
  handleActionCompleted: (action: string, type: AlertColor) => void;
}

export default function RequestsAccordion({
  requestsIn = [],
  requestsOut = [],
  handleActionCompleted = (_action: string, _type: AlertColor) => {},
}: Props) {
  const [requestsInExpanded, setRequestsInExpanded] = useState(
    requestsIn.length > 0
  );
  const [requestsOutExpanded, setRequestsOutExpanded] = useState(false);

  useEffect(() => {
    if (requestsIn.length > 0) setRequestsInExpanded(true);
    if (requestsIn.length === 0) setRequestsInExpanded(false);
    if (requestsOut.length === 0) setRequestsOutExpanded(false);
  }, [requestsIn, requestsOut]);

  async function handleAcceptRequest(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    request: FriendRequest
  ) {
    event.stopPropagation();
    try {
      const updateResponse = await chrome.runtime.sendMessage({
        type: "updateUser",
        updateItems: {
          friends: {
            add: [request.id],
          },
        },
      });
      if (updateResponse && !updateResponse.ok)
        handleActionCompleted(updateResponse.message, "error");
      else handleActionCompleted("Friend request accepted.", "success");
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  }

  async function handleRejectRequest(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    request: FriendRequest,
    requestType: string
  ) {
    event.stopPropagation();
    const key = requestType == "incoming" ? "removeIncoming" : "removeOutgoing";
    try {
      const updateResponse = await chrome.runtime.sendMessage({
        type: "updateUser",
        updateItems: {
          friendRequests: {
            [key]: [request.id],
          },
        },
      });
      if (updateResponse && !updateResponse.ok)
        handleActionCompleted(updateResponse.message, "error");
      else handleActionCompleted("Friend request removed.", "success");
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: "1.25rem", mt: 2 }}>
        Friend Requests
      </Typography>

      <Accordion
        slotProps={{ transition: { unmountOnExit: true } }}
        defaultExpanded={requestsIn.length > 0}
        expanded={requestsInExpanded}
        onChange={(_event, expanded) => setRequestsInExpanded(expanded)}
        disableGutters
        square
        sx={{
          "&:before": {
            display: "none",
          },
          "&:not(:last-child)": {
            borderBottom: 0,
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="received-requests-content"
          id="received-requests-header"
          sx={{
            flexDirection: "row-reverse",
            "& .MuiAccordionSummary-content": {
              marginLeft: 2,
            },
          }}
        >
          <Typography variant="h6" sx={{ fontSize: "1rem" }}>
            Received {`(${requestsIn.length})`}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {requestsIn.map((request) => (
            <Accordion
              slotProps={{ transition: { unmountOnExit: true } }}
              key={request.id}
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
                aria-controls={`panel${request.id}-content`}
                id={`panel${request.id}-header`}
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
                    src={request.photoUrl}
                    alt={request.name}
                    sx={{ width: 40, height: 40 }}
                  />
                  <Typography sx={{ flexGrow: 1 }}>{request.name}</Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleAcceptRequest(e, request)}
                      sx={{
                        color: "success.main",
                        "&:hover": {
                          backgroundColor: "success.light",
                          color: "white",
                        },
                      }}
                    >
                      <Check fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) =>
                        handleRejectRequest(e, request, "incoming")
                      }
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
                </Stack>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  p: 2,
                  overflow: "hidden",
                  maxHeight: "fit-content",
                  boxSizing: "border-box",
                }}
              >
                <Box>
                  <Typography variant="body2">
                    Email: {`${request.id}@scu.edu`}
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </AccordionDetails>
      </Accordion>
      <Accordion
        slotProps={{ transition: { unmountOnExit: true } }}
        disableGutters
        expanded={requestsOutExpanded}
        onChange={(_event, expanded) => setRequestsOutExpanded(expanded)}
        sx={{
          mb: 2,
          "&:before": {
            display: "none",
          },
          "&.Mui-expanded:last-of-type": {
            mb: 2,
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="sent-requests-content"
          id="sent-requests-header"
          sx={{
            flexDirection: "row-reverse",
            "& .MuiAccordionSummary-content": {
              marginLeft: 2,
            },
          }}
        >
          <Typography variant="h6" sx={{ fontSize: "1rem" }}>
            Sent {`(${requestsOut.length})`}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {requestsOut.map((request) => (
            <Accordion
              slotProps={{ transition: { unmountOnExit: true } }}
              key={request.id}
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
                aria-controls={`panel${request.id}-content`}
                id={`panel${request.id}-header`}
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
                    src={request.photoUrl}
                    alt={request.name}
                    sx={{ width: 40, height: 40 }}
                  />
                  <Typography sx={{ flexGrow: 1 }}>{request.name}</Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={(e) =>
                        handleRejectRequest(e, request, "outgoing")
                      }
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
                </Stack>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  p: 2,
                  overflow: "hidden",
                  maxHeight: "fit-content",
                  boxSizing: "border-box",
                }}
              >
                <Box>
                  <Typography variant="body2">
                    Email: {`${request.id}@scu.edu`}
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
