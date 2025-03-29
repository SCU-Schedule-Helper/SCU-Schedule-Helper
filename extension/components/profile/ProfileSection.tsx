import React, { useState, useEffect, ChangeEvent } from "react";
import { Box, Typography, Button, Stack, TextField } from "@mui/material";
import { Edit } from "@mui/icons-material";
// @ts-ignore
import { compress } from "compress.js/src/compress.js";
import { SendAlertFunction, UserProfile } from "../utils/types";

interface Props {
  userInfo: UserProfile | null;
  handleActionCompleted: SendAlertFunction;
}

export default function ProfileSection({
  userInfo,
  handleActionCompleted,
}: Props) {
  const [name, setName] = useState(userInfo?.name || "");
  const [photoUrl, setPhotoUrl] = useState(
    getUniquePhotoUrl(userInfo?.photoUrl)
  );
  const [isEditingName, setIsEditingName] = useState(false);

  function getUniquePhotoUrl(url: string | undefined) {
    if (!url)
      return "https://scu-schedule-helper.s3.amazonaws.com/default-avatar.jpg";
    return `${url}?${new Date().getTime()}`;
  }

  useEffect(() => {
    setName(userInfo?.name || "");
    setPhotoUrl(getUniquePhotoUrl(userInfo?.photoUrl));
  }, [userInfo]);

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    if (!userInfo) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      !file.type.startsWith("image/png") &&
      !file.type.startsWith("image/jpeg")
    ) {
      handleActionCompleted("File must be a png/jpg image.", "error");
      return;
    }
    const compressedFile = await compress(file, {
      quality: 0.9,
      crop: true,
      aspectRatio: "1:1",
      maxWidth: 1000,
      maxHeight: 1000,
    });
    submitPersonal(compressedFile, null);
  }

  async function submitPersonal(photoFile: any, newName: string | null) {
    if (!userInfo) return;

    const message: any = {
      type: "updateUser",
      updateItems: {
        personal: {
          photo: {
            size: photoFile ? photoFile.size : 0,
          },
          name: newName,
        },
      },
    };
    if (!photoFile) delete message.updateItems.personal.photo;
    if (!newName) delete message.updateItems.personal.newName;
    const response = await chrome.runtime.sendMessage(message);
    if (response && !response.ok) {
      handleActionCompleted(response.message, "error");
    } else {
      if (response && response.presignedUploadUrl) {
        const uploadResponse = await fetch(response.presignedUploadUrl, {
          method: "PUT",
          body: photoFile,
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": photoFile.size,
          },
        });
        if (!uploadResponse.ok) {
          handleActionCompleted(
            "Failed to upload photo. Contact stephenwdean@gmail.com if this issue persists.",
            "error"
          );
          return;
        } else if (
          userInfo.photoUrl.startsWith(
            "https://scu-schedule-helper.s3.amazonaws.com"
          )
        ) {
          setPhotoUrl(getUniquePhotoUrl(userInfo.photoUrl)); // Force refresh.
        }
      }
      handleActionCompleted("Profile updated successfully.", "success");
      setIsEditingName(false);
    }
  }

  function handleNameChange() {
    if (!userInfo) return;
    submitPersonal(null, name);
  }

  function cancelEditing() {
    if (!userInfo) return;
    setName(userInfo.name || "");
    setIsEditingName(false);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (!userInfo) return;
    const newName = e.target.value;
    setName(newName);
    if (newName !== userInfo.name) {
      setIsEditingName(true);
    }
  }

  if (!userInfo?.id) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body1">Loading profile...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <label htmlFor="profile-picture-upload" style={{ cursor: "pointer" }}>
          <Box
            sx={{
              position: "relative",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              border: "7px solid #802a25",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={photoUrl}
              alt={`${name || "User"}'s profile photo`}
              style={{
                width: "100px",
                height: "100px",
                objectFit: "cover",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                opacity: 0,
                transition: "opacity 0.1s",
                "&:hover": {
                  opacity: 1,
                },
              }}
            >
              <Edit
                sx={{
                  color: "white",
                  fontSize: 25,
                }}
              />
            </Box>
          </Box>
        </label>
        <input
          type="file"
          id="profile-picture-upload"
          accept="image/png, image/jpeg"
          hidden
          onChange={handlePhotoChange}
        />
        <Stack direction="column" spacing={1} sx={{ flexGrow: 1 }}>
          <Typography variant="body1" sx={{ mb: "5px" }}>
            Preferred Name:
          </Typography>

          <TextField
            variant="outlined"
            value={name}
            onChange={handleInputChange}
            placeholder={"Enter Name"}
            sx={{
              width: "250px",
              "& .MuiOutlinedInput-root": {
                height: "40px",
                "& fieldset": {
                  borderColor: "#802a25",
                },
                "&:hover fieldset": {
                  borderColor: "#671f1a",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#671f1a",
                },
                "& input": {
                  padding: "10px 12px",
                },
              },
            }}
          />

          <Box sx={{ height: "40px", mt: 1 }}>
            {isEditingName && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNameChange}
                  sx={{
                    backgroundColor: "#802a25",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "#671f1a",
                    },
                  }}
                  size="small"
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  onClick={cancelEditing}
                  sx={{
                    borderColor: "#802a25",
                    color: "#802a25",
                    "&:hover": {
                      borderColor: "#802a25",
                      backgroundColor: "#802a25",
                      color: "white",
                    },
                  }}
                  size="small"
                >
                  Cancel
                </Button>
              </Stack>
            )}
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
