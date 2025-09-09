import { useState } from "react";
import {
  Autocomplete,
  TextField,
  Button,
  CircularProgress,
  Typography,
  AlertColor,
} from "@mui/material";

interface LimitedUserProfile {
  id: string;
  name: string;
  photoUrl: string;
}

export default function UserSearch({
  handleActionCompleted = (_action: string, _type: AlertColor) => { },
}) {
  const [selectedUser, setSelectedUser] = useState<LimitedUserProfile | null>(null);
  const [users, setUsers] = useState<LimitedUserProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  async function searchUsersByName(name: string) {
    if (!name || name.length < 1) {
      setUsers([]);
      return;
    }
    setSearchLoading(true);
    try {
      const foundUsers = await chrome.runtime.sendMessage({
        type: "queryUserByName",
        name: name,
      });
      if (typeof foundUsers === "string") {
        console.error("Error searching users:", foundUsers);
        handleActionCompleted(foundUsers, "error");
        setUsers([]);
      } else setUsers(foundUsers || []);
    } catch (error) {
      setUsers([]);
      console.error("Error searching users:", error);
      handleActionCompleted(
        "An unknown error occurred while searching users.",
        "error"
      );
    } finally {
      setSearchLoading(false);
    }
  }

  async function sendFriendRequest() {
    if (!selectedUser) return;
    const message = {
      type: "updateUser",
      updateItems: {
        friendRequests: {
          send: [selectedUser.id],
        },
      },
    };

    try {
      const updateResponse = await chrome.runtime.sendMessage(message);
      if (updateResponse && !updateResponse.ok)
        handleActionCompleted(updateResponse.message, "error");
      else
        handleActionCompleted(`Friend request sent successfully!`, "success");
      setSelectedUser(null);
    } catch (error) {
      console.error("Error sending friend request:", error);
      handleActionCompleted(
        "An unknown error occurred while sending friend request.",
        "error"
      );
    }
  }

  return (
    <>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Search Users
      </Typography>
      <Autocomplete
        fullWidth
        options={users}
        loading={searchLoading}
        getOptionLabel={(option) => `${option.name} (${option.id}@scu.edu)`}
        onInputChange={(_, newInputValue) => {
          searchUsersByName(newInputValue);
        }}
        onChange={(_, newValue) => {
          setSelectedUser(newValue);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Enter name"
            variant="outlined"
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {searchLoading ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "#ccc",
                },
                "&:hover fieldset": {
                  borderColor: "#ccc",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#703331",
                },
              },
              "& .MuiInputLabel-root": {
                color: "#ccc",
              },
              "& .MuiInputLabel-outlined-root": {
                "&.Mui-focused": {
                  color: "#703331",
                },
              },
              "& .Mui-focused.MuiInputLabel-root": {
                color: "#703331",
              },
            }}
          />
        )}
        sx={{ mb: 2 }}
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        disabled={!selectedUser}
        onClick={sendFriendRequest}
        sx={{
          backgroundColor: "#703331",
          "&:hover": {
            backgroundColor: "#5a2c28",
          },
        }}
      >
        Send Invite
      </Button>
    </>
  );
}
