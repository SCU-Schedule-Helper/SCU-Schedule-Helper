import { useState, useEffect } from "react";
import { Alert, AlertColor, Box, Snackbar } from "@mui/material";
import AuthWrapper from "../utils/AuthWrapper";
import FriendsAccordion from "./FriendsAccordion";
import RequestsAccordion from "./RequestsAccordion";
import UserSearch from "./UserSearch";

interface Alert {
  message: string;
  type: AlertColor;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState([]);
  const [requestsIn, setRequestsIn] = useState([]);
  const [requestsOut, setRequestsOut] = useState([]);
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);
  const [currentAction, setCurrentAction] = useState(
    null as Alert | null
  );

  useEffect(() => {
    async function fetchFriendData() {
      try {
        let { friendRequestsIn, friendRequestsOut, friends } =
          await chrome.storage.local.get([
            "friendRequestsIn",
            "friendRequestsOut",
            "friends",
          ]);

        friendRequestsIn ||= {};
        friendRequestsOut ||= {};
        friends ||= {};

        setRequestsOut(Object.values(friendRequestsOut));
        setRequestsIn(Object.values(friendRequestsIn));
        setFriends(Object.values(friends));
      } catch (error) {
        console.error("Error fetching friend data:", error);
      }
    }

    fetchFriendData();
    chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (
        namespace === "local" &&
        (changes.friendRequestsIn ||
          changes.friendRequestsOut ||
          changes.friends)
      )
        fetchFriendData();
    });
  }, []);

  function handleActionCompleted(action: string, type: AlertColor) {
    setCurrentAction({
      message: action,
      type,
    });
    setShowActionCompletedMessage(true);
  }

  return (
    <AuthWrapper>
      <Box
        sx={{
          overflow: "auto",
          padding: 2,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <FriendsAccordion
          friends={friends}
          handleActionCompleted={handleActionCompleted}
        />
        <RequestsAccordion
          requestsIn={requestsIn}
          requestsOut={requestsOut}
          handleActionCompleted={handleActionCompleted}
        />
        <Box
          sx={{
            flexDirection: "column",
            display: "flex",
          }}
        ></Box>
        <UserSearch handleActionCompleted={handleActionCompleted}></UserSearch>
        <Snackbar
          open={showActionCompletedMessage}
          autoHideDuration={3000}
          onClose={() => setShowActionCompletedMessage(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setShowActionCompletedMessage(false)}
            severity={currentAction?.type || "success"}
            sx={{ width: "100%" }}
          >
            {currentAction?.message}
          </Alert>
        </Snackbar>
      </Box>
    </AuthWrapper>
  );
}
