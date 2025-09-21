export class UserFullProfile {
  constructor() {
    this.id = "";
    this.name = "";
    this.email = "";
    this.photoUrl = "";
    this.preferences = new UserPreferences();
    this.coursesTaken = [];
    this.interestedSections = {};
    this.friends = [];
    this.friendRequests = [];
  }
}

export class UserFriendProfile {
  constructor() {
    this.id = "";
    this.name = "";
    this.photoUrl = "";
    this.coursesTaken = [];
    this.interestedSections = {};
  }
}

export class UserLimitedProfile {
  constructor() {
    this.id = "";
    this.name = "";
    this.photoUrl = "";
  }
}

export class FriendRequestProfile extends UserLimitedProfile {
  constructor() {
    super();
    this.type = "";
  }
}

export class UserPreferences {
  constructor() {
    this.difficulty = 0;
    this.scoreWeighting = {
      scuEvals: 0,
      rmp: 0,
    };
    this.preferredSectionTimeRange = {
      startHour: 0,
      startMinute: 0,
      endHour: 0,
      endMinute: 0,
    };
    this.courseTracking = true;
    this.showRatings = true;
  }
}

export function validResponse (response) {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
  };
};

export function unauthorizedError (message) {
  return {
    statusCode: 401,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Authorization failed: ${message}`,
    }),
  };
};

export function notFoundError (error) {
  return {
    statusCode: 404,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: error,
    }),
  };
};

export const internalServerError = {
  statusCode: 500,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: `Something went wrong on our end. Please try again later or contact stephenwdean@gmail.com.`,
  }),
};

