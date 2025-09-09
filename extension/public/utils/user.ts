import {
  COURSE_CODE_PATTERN,
  COURSE_TAKEN_PATTERN,
  INTERESTED_SECTION_PATTERN,
  PROD_USER_ENDPOINT,
  WORKDAY_COURSE_HISTORY_URL,
  WORKDAY_CURRENT_COURSES_URL,
} from "./constants.ts";

import { fetchWithAuth, signOut } from "./authorization.ts";
import { FriendProfile, FriendRequest, FriendRequestType, UserProfile } from "./types.ts";

interface ErrorResponse {
  message: string;
}

interface FriendMap {
  [id : string] : FriendProfile;
}

interface FriendRequestMap {
  [id : string] : FriendRequest;
}

export async function refreshUserData(items:string[] = []) {
  const itemsQuery = items.length > 0 ? `?items=${items.join(",")}` : "";
  const response = await fetchWithAuth(`${PROD_USER_ENDPOINT}/me${itemsQuery}`);
  if (!response) {
    return "Unknown error fetching user data. Please try again later.";
  }
  let data : UserProfile | ErrorResponse = await response.json();
  if (!response.ok) {
    data = data as ErrorResponse;
    return `Error fetching user data: ${data.message}`;
  }
  data = data as UserProfile;

  if (items.includes("friends") || items.length === 0) {
    const friends: FriendMap = {};
    await chrome.storage.local.set({
      friendCoursesTaken: {},
      friendInterestedSections: {},
    });
    for (const friendObj of data.friends) {
      friends[friendObj.id] = friendObj;
      await updateFriendCourseAndSectionIndexes(
        friendObj.id,
        friendObj.coursesTaken,
        friendObj.interestedSections,
      );
    }
    await chrome.storage.local.set({
      friends,
    });
  }
  if (items.includes("friendRequests") || items.length === 0) {
    const friendRequestsIn: FriendRequestMap = {};
    const friendRequestsOut: FriendRequestMap = {};
    for (const friendReqObj of data.friendRequests) {
      if (friendReqObj.type === "incoming") {
        friendRequestsIn[friendReqObj.id] = friendReqObj;
      }
      if (friendReqObj.type === "outgoing") {
        friendRequestsOut[friendReqObj.id] = friendReqObj;
      }
    }
    await chrome.storage.local.set({
      friendRequestsIn,
      friendRequestsOut,
    });
  }
  const currentUserInfo =
    (await chrome.storage.local.get("userInfo")).userInfo || {};
  if (items.includes("personal") || items.length === 0) {
    currentUserInfo.id = data.id;
    currentUserInfo.name = data.name;
    currentUserInfo.photoUrl = data.photoUrl;
  }
  if (items.includes("preferences") || items.length === 0) {
    currentUserInfo.preferences = data.preferences;
  }
  if (items.includes("coursesTaken") || items.length === 0) {
    currentUserInfo.coursesTaken = data.coursesTaken;
  }
  if (items.includes("interestedSections") || items.length === 0) {
    currentUserInfo.interestedSections = data.interestedSections;
  }
  await chrome.storage.local.set({
    userInfo: {
      ...currentUserInfo,
    },
  });
  return null;
}

export async function updateUser(updateItems: any, allowLocalOnly = false): Promise<{ message: string; ok: boolean }> {
  const response = await fetchWithAuth(PROD_USER_ENDPOINT, {
    method: "PUT",
    body: JSON.stringify(updateItems),
  });
  if (!response && !allowLocalOnly) {
    return {
      message: "Error updating user data (you may have been signed out).",
      ok: false,
    };
  }
  const data = (await response?.json()) || {};
  if (response && !response.ok) {
    return {
      message: `${data.message || "Unknown error updating user data."}`,
      ok: false,
    };
  }
  const errorUpdatingLocalCache = await updateLocalCache(updateItems);
  if (errorUpdatingLocalCache) {
    return {
      message: errorUpdatingLocalCache,
      ok: false,
    };
  }
  return {
    message: "",
    ...data,
    ok: true,
  };
}

async function updateLocalCache(updateItems: any) {
  const userInfo = (await chrome.storage.local.get("userInfo")).userInfo || {};
  if (updateItems.personal) {
    if (updateItems.personal.name) userInfo.name = updateItems.personal.name;
    if (updateItems.personal.photoUrl === "default")
      userInfo.photoUrl =
        "https://scu-schedule-helper.s3.us-west-1.amazonaws.com/default-avatar.jpg";
    if (updateItems.personal.photo) {
      userInfo.photoUrl = getS3PhotoUrl(userInfo.id);
    }
  }
  if (updateItems.preferences) {
    userInfo.preferences = {
      ...(userInfo.preferences || {}),
      ...updateItems.preferences,
    };
  }
  if (updateItems.coursesTaken) {
    userInfo.coursesTaken = userInfo.coursesTaken.concat(
      updateItems.coursesTaken.add,
    );
    const coursesTaken = new Set(userInfo.coursesTaken);
    if (updateItems.coursesTaken.remove)
      for (const course of updateItems.coursesTaken.remove)
        coursesTaken.delete(course);
    userInfo.coursesTaken = Array.from(coursesTaken);
  }
  if (updateItems.interestedSections) {
    if (!userInfo.interestedSections) {
      userInfo.interestedSections = {};
    }
    for (const section in updateItems.interestedSections.add) {
      userInfo.interestedSections[section] =
        updateItems.interestedSections.add[section];
    }
    if (updateItems.interestedSections.remove)
      for (const section of updateItems.interestedSections.remove)
        delete userInfo.interestedSections[section];
  }
  if (updateItems.friends) {
    if (updateItems.friends.add) {
      for (const friendId of updateItems.friends.add) {
        const errorAddingFriend = await addFriendLocally(friendId, "incoming");
        if (errorAddingFriend) {
          return errorAddingFriend;
        }
      }
    }
    if (updateItems.friends.remove) {
      for (const friendId of updateItems.friends.remove) {
        await removeFriendLocally(friendId);
      }
    }
  }
  if (updateItems.friendRequests) {
    if (updateItems.friendRequests.send) {
      for (const friendId of updateItems.friendRequests.send) {
        const errorCreatingFriendRequest = await addFriendRequestLocally(
          friendId,
          "outgoing",
        );
        if (errorCreatingFriendRequest) {
          return errorCreatingFriendRequest;
        }
      }
    }
    if (updateItems.friendRequests.removeIncoming) {
      for (const friendId of updateItems.friendRequests.removeIncoming) {
        await removeFriendRequestLocally(friendId, "incoming");
      }
    }
    if (updateItems.friendRequests.removeOutgoing) {
      for (const friendId of updateItems.friendRequests.removeOutgoing) {
        await removeFriendRequestLocally(friendId, "outgoing");
      }
    }
  }
  await chrome.storage.local.set({
    userInfo: {
      ...userInfo,
    },
  });
  return null;
}

export async function deleteAccount() {
  const deleteResponse = await fetchWithAuth(PROD_USER_ENDPOINT, {
    method: "DELETE",
  });
  if (!deleteResponse) {
    return "Unknown error deleting account. Please try again later.";
  }
  if (!deleteResponse.ok) {
    const data = await deleteResponse.json();
    return `Error deleting account: ${data.message}`;
  }
  await signOut();
  return null;
}

export async function addFriendLocally(friendId: string, friendReqType: FriendRequestType, notificationType = "") {
  const getFriendProfileResponse = await fetchWithAuth(
    `${PROD_USER_ENDPOINT}/${friendId}`,
  );
  if (!getFriendProfileResponse) {
    return "Unknown error getting friend profile. Please try again later.";
  }
  const userData = await getFriendProfileResponse.json();
  if (!getFriendProfileResponse.ok) {
    return `Error getting friend profile: ${userData.message}`;
  }
  await updateFriendCourseAndSectionIndexes(
    friendId,
    userData.coursesTaken,
    userData.interestedSections,
  );
  const friendProfile = {
    ...userData,
  };
  const currentFriends =
    (await chrome.storage.local.get("friends")).friends || {};
  const friendReqsKey =
    friendReqType === "incoming" ? "friendRequestsIn" : "friendRequestsOut";
  const currentFriendRequests =
    (await chrome.storage.local.get(friendReqsKey))[friendReqsKey] || {};
  delete currentFriendRequests[friendId];
  await chrome.storage.local.set({
    friends: {
      ...currentFriends,
      [friendId]: friendProfile,
    },
    [friendReqsKey]: currentFriendRequests,
  });
  if (notificationType === "FriendRequestAccepted") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "/images/icon-128.png",
      title: "Friend Request Accepted",
      message: `${friendProfile.name} accepted your friend request.`,
      priority: 2,
    });
  }
  return null;
}

export async function updateFriendCourseAndSectionIndexes(
  friendId: string,
  coursesTaken: string[] | null | undefined,
  interestedSections: { [key: string]: string } | null | undefined,
) {
  coursesTaken = coursesTaken || [];
  interestedSections = interestedSections || {};
  const friendCoursesTaken =
    (await chrome.storage.local.get("friendCoursesTaken")).friendCoursesTaken ||
    {};
  for (const course of coursesTaken) {
    const courseMatch = COURSE_TAKEN_PATTERN.exec(course);
    if (!courseMatch) {
      continue;
    }
    const profName: string = courseMatch[1] as string;
    const courseCode: string = (courseMatch[2] as string)
      .substring(0, (courseMatch[2] as string).indexOf("-"))
      .replace(/\s/g, "");
    if (!courseCode.match(COURSE_CODE_PATTERN)) continue;
    const curCourseIndex = friendCoursesTaken[courseCode] || {};
    const curProfIndex = friendCoursesTaken[profName] || {};
    curCourseIndex[friendId] = course; // A friend should only have one course entry per course code.
    curProfIndex[friendId] = curProfIndex[friendId] || [];
    curProfIndex[friendId].push(course);
    friendCoursesTaken[courseCode] = curCourseIndex;
    friendCoursesTaken[profName] = curProfIndex;
  }
  const friendInterestedSections =
    (await chrome.storage.local.get("friendInterestedSections"))
      .friendInterestedSections || {};
  for (const section in interestedSections) {
    const sectionMatch = INTERESTED_SECTION_PATTERN.exec(section);
    if (!sectionMatch) {
      continue;
    }
    const profName: string = sectionMatch[1] as string;
    const courseCode: string = (sectionMatch[2] as string)
      .substring(0, (sectionMatch[2] as string).indexOf("-"))
      .replace(/\s/g, "");
    const curCourseIndex = friendInterestedSections[courseCode] || {};
    const curProfIndex = friendInterestedSections[profName] || {};
    curCourseIndex[friendId] = section; // A friend should only have one section entry per course code.
    curProfIndex[friendId] = curProfIndex[friendId] || [];
    curProfIndex[friendId].push(section);
    friendInterestedSections[courseCode] = curCourseIndex;
    friendInterestedSections[profName] = curProfIndex;
  }
  await chrome.storage.local.set({
    friendCoursesTaken,
    friendInterestedSections,
  });
}

export async function clearFriendCourseAndSectionIndexes(friendId: string) {
  const friendCoursesTaken =
    (await chrome.storage.local.get("friendCoursesTaken")).friendCoursesTaken ||
    {};
  const friendInterestedSections =
    (await chrome.storage.local.get("friendInterestedSections"))
      .friendInterestedSections || {};
  for (const courseCode in friendCoursesTaken) {
    if (friendCoursesTaken[courseCode][friendId]) {
      delete friendCoursesTaken[courseCode][friendId];
    }
  }
  for (const profName in friendCoursesTaken) {
    if (friendCoursesTaken[profName][friendId]) {
      delete friendCoursesTaken[profName][friendId];
    }
  }
  for (const courseCode in friendInterestedSections) {
    if (friendInterestedSections[courseCode][friendId]) {
      delete friendInterestedSections[courseCode][friendId];
    }
  }
  for (const profName in friendInterestedSections) {
    if (friendInterestedSections[profName][friendId]) {
      delete friendInterestedSections[profName][friendId];
    }
  }
  await chrome.storage.local.set({
    friendCoursesTaken,
    friendInterestedSections,
  });
}

export async function addFriendRequestLocally(friendId: string, type: FriendRequestType, notificationType = "") {
  const getUserPublicProfileResponse = await fetchWithAuth(
    `${PROD_USER_ENDPOINT}/${friendId}`,
  );
  if (!getUserPublicProfileResponse) {
    return "Unknown error getting user profile. Please try again later.";
  }
  const userData = await getUserPublicProfileResponse.json();
  if (!getUserPublicProfileResponse.ok) {
    return `Error getting user profile: ${userData.message}`;
  }
  const friendRequestsKey =
    type === "incoming" ? "friendRequestsIn" : "friendRequestsOut";
  const existingFriendRequests =
    (await chrome.storage.local.get(friendRequestsKey))[friendRequestsKey] ||
    {};
  existingFriendRequests[friendId] = {
    ...userData,
  };
  await chrome.storage.local.set({
    [friendRequestsKey]: existingFriendRequests,
  });
  if(notificationType === "FriendRequestReceived") {
    console.log("creating chrome notification");
    chrome.notifications.create({
      type: "basic",
      iconUrl: "/images/icon-128.png",
      title: "Friend Request Received",
      message: `${userData.name} sent you a friend request.`,
      priority: 2,
    });
  }
  return null;
}

export async function removeFriendLocally(friendId: string) {
  const currentFriends =
    (await chrome.storage.local.get("friends")).friends || {};
  delete currentFriends[friendId];
  await chrome.storage.local.set({ friends: currentFriends });
  await clearFriendCourseAndSectionIndexes(friendId);
}

export async function removeFriendRequestLocally(friendId: string, type: FriendRequestType) {
  const friendRequestsKey =
    type === "incoming" ? "friendRequestsIn" : "friendRequestsOut";
  const existingFriendRequests =
    (await chrome.storage.local.get(friendRequestsKey))[friendRequestsKey] ||
    {};
  delete existingFriendRequests[friendId];
  await chrome.storage.local.set({
    [friendRequestsKey]: existingFriendRequests,
  });
}

export async function refreshInterestedSections() {
  // Check the expiration date of the interestedSections, delete if expired, and also delete from the remote server.
  const userInfo = (await chrome.storage.local.get("userInfo")).userInfo || {};
  const interestedSections = userInfo.interestedSections || {};
  const sectionsToRemove: string[] = [];
  for (const section in interestedSections) {
    const expirationDate = interestedSections[section];
    if (new Date() > new Date(expirationDate)) {
      sectionsToRemove.push(section);
    }
  }
  if (sectionsToRemove.length === 0) {
    return;
  }
  await updateUser({ interestedSections: { remove: sectionsToRemove } });
}

export async function queryUserByName(name: string) {
  const response = await fetchWithAuth(
    `${PROD_USER_ENDPOINT}/query?name=${encodeURIComponent(name)}`,
  );
  if (!response) {
    return "Unknown error querying users. Please try again later.";
  }
  const data = await response.json();
  if (!response.ok) {
    return `Error searching users: ${data.message}`;
  }
  return data;
}

export async function importCurrentCourses() {
  return await openTabAndSendMessage(
    WORKDAY_CURRENT_COURSES_URL,
    "importCurrentCourses",
  );
}

export async function importCourseHistory() {
  return await openTabAndSendMessage(
    WORKDAY_COURSE_HISTORY_URL,
    "importCourseHistory",
  );
}

async function openTabAndSendMessage(url: string, message: string) {
  const createdTab = await chrome.tabs.create({ url });

  async function tabListener(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, _tab: chrome.tabs.Tab) {
    if (tabId === createdTab.id && changeInfo.status === "complete") {
      try {
        const response = await chrome.tabs.sendMessage(createdTab.id, message);
        chrome.tabs.onUpdated.removeListener(tabListener);
        return response;
      } catch (_ignore) { 
        // Ignore the error.
       }
    }
    return true;
  }
  chrome.tabs.onUpdated.addListener(tabListener);
}

function getS3PhotoUrl(userId: string) {
  return `https://scu-schedule-helper.s3.amazonaws.com/u%23${userId}/photo`;
}
