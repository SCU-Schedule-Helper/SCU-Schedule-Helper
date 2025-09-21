export function validResponse(response) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: response }),
  };
}

export function validResponseWithBody(response) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
  };
}

export function badRequestResponse(message) {
  return {
    statusCode: 400,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
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
