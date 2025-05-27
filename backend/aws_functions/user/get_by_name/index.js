import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { handleWithAuthAndCors } from "./utils/authorization.js";
import {
  badRequestError,
  internalServerError,
  validResponse,
} from "./model.js";

export async function handler(event, context) {
  return await handleWithAuthAndCors(
    event,
    context,
    handleGetUserByNameRequest,
  );
}

const USER_INFO_PATTERN = /U{(.*?)}N{(.*?)}P{(.*?)}/;
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_DDB_REGION,
});
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

async function handleGetUserByNameRequest(event, context, userId) {
  const nameQueryParam = event.queryStringParameters?.name;
  if (!nameQueryParam) {
    return badRequestError(`Missing required query parameter 'name'.`);
  }
  const caseInsensitiveName = nameQueryParam.toLowerCase();
  const nameIndexQuery = await dynamoClient.send(
    new QueryCommand({
      KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": { S: `name-index#${caseInsensitiveName.charAt(0)}` },
        ":sk": { S: caseInsensitiveName },
      },
      TableName: tableName,
    }),
  );
  if (nameIndexQuery.$metadata.httpStatusCode !== 200) {
    console.error(
      `INTERNAL: could not query name index due to error ${nameIndexQuery.$metadata.httpStatusCode}`,
    );
    return internalServerError;
  }
  const userItems = nameIndexQuery.Items || [];
  const responseItems = [];
  for (const userItem of userItems) {
    if (!userItem.users || !userItem.users.SS) continue;
    for (const user of userItem.users.SS) {
      const userInfo = USER_INFO_PATTERN.exec(user);
      if (!userInfo || userInfo[1] == userId) continue;
      responseItems.push({
        id: userInfo[1],
        name: userInfo[2],
        photoUrl: userInfo[3],
      });
    }
  }
  return validResponse(responseItems);
}
