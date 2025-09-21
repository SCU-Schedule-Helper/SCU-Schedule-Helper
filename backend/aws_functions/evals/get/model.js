export const notModifiedResponse = {
  statusCode: 304,
  headers: {
    "Content-Type": "application/json",
  },
};

export function validResponse(headers, response) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(response),
  };
}

export function unauthorizedError(message) {
  return {
    statusCode: 401,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Authorization failed: ${message}`,
    }),
  };
}

export const internalServerError = {
  statusCode: 500,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: `Something went wrong on our end. Please try again later or contact stephenwdean@gmail.com.`,
  }),
};
