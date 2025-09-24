import {
  DynamoDBClient,
  QueryCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { handleWithAuthorization } from "./utils/authorization.js";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { SESv2Client, DeleteContactCommand } from "@aws-sdk/client-sesv2";
import {
  internalServerError,
  noContentValidResponse,
  notFoundError,
} from "./model.js";

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_DDB_REGION,
});
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
});
const lambdaClient = new LambdaClient({
  region: process.env.AWS_LAMBDA_REGION,
});
const sesRegion = process.env.AWS_DDB_REGION;
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

const CONTACT_LIST_NAME = 'SCU-Schedule-Helper-Users';

function createSESClient(region) {
  return new SESv2Client({
    region: region,
    maxAttempts: 5,
    retryMode: "standard"
  });
}

async function removeContactFromList(email, region) {
  const sesClient = createSESClient(region);

  try {
    const result = await sesClient.send(new DeleteContactCommand({
      ContactListName: CONTACT_LIST_NAME,
      EmailAddress: email
    }));
    if (result.$metadata.httpStatusCode !== 200) {
      console.error(`Failed to remove ${email} from SES contact list:`, result);
    }
  } catch (error) {
    if (error.name === 'NotFoundException') {
      console.log(`Contact ${email} not found in SES contact list (may have been already removed)`);
      return;
    }
    console.error(`INTERNAL Failed to remove ${email} from SES contact list:`, error.message);
  }
}

export async function handler(event, context) {
  return await handleWithAuthorization(event, context, deleteUser);
}

async function deleteUser(event, context, userId) {
  let userInfo, keys;
  try {
    ({ userInfo, keys } = await getSubsAndKeysForDeletion(`u#${userId}`));
  } catch (error) {
    console.error("INTERNAL: Error getting sort keys:", error);
    return internalServerError;
  }
  if (keys.length === 0) {
    return notFoundError(`Account could not be found.`);
  }
  const batches = [];
  while (keys.length > 0) {
    batches.push(keys.splice(0, 25));
  }
  for (const batch of batches) {
    const delete_requests = batch.map((key) => ({
      DeleteRequest: {
        Key: {
          pk: { S: key.pk },
          sk: { S: key.sk },
        },
      },
    }));
    if (delete_requests.length === 0) return noContentValidResponse;
    const params = {
      RequestItems: {
        [tableName]: delete_requests,
      },
    };

    try {
      await dynamoDBClient.send(new BatchWriteItemCommand(params));
    } catch (error) {
      console.error("INTERNAL: Error deleting items:", error);
      return internalServerError;
    }
  }
  try {
    // Delete the user's profile picture from S3.
    const photoKey = `u#${userId}/photo`;
    const photoParams = {
      Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
      Key: photoKey,
    };
    const s3Response = await s3Client.send(
      new DeleteObjectCommand(photoParams),
    );
    if (s3Response.$metadata.httpStatusCode !== 204) {
      console.error(`INTERNAL: Error deleting profile photo from S3: ${s3Response}`);
      return internalServerError;
    }
  } catch (error) {
    console.error("INTERNAL: Error deleting user's profile picture:", error);
    return internalServerError;
  }
  if (userInfo.email) {
    await removeContactFromList(userInfo.email, sesRegion);
  }

  await Promise.all([
    tryNotifyClients(userId, userInfo),
    deleteNameFromIndex(userId, userInfo.name),
  ]);
  return noContentValidResponse;
}

async function getSubsAndKeysForDeletion(pk) {
  const userQuery = {
    TableName: tableName,
    KeyConditionExpression: "pk = :primaryKey",
    ExpressionAttributeValues: {
      ":primaryKey": { S: pk },
    },
  };
  const userId = pk.split("u#")[1];

  const data = await dynamoDBClient.send(new QueryCommand(userQuery));
  const keys = [];
  let selfSubs = [];
  let name = "";
  let email = "";
  let friendIds = [];
  let friendReqInIds = [];
  let friendReqOutIds = [];
  for (const dataItem of data.Items) {
    keys.push({
      pk,
      sk: dataItem.sk.S,
    });
    if (dataItem.sk.S.startsWith("info#personal")) {
      if (dataItem.subscriptions && dataItem.subscriptions.SS)
        selfSubs = dataItem.subscriptions.SS.map((sub) => JSON.parse(sub));
      if (dataItem.name && dataItem.name.S) name = dataItem.name.S;
      if (dataItem.email && dataItem.email.S) email = dataItem.email.S;
    }
    if (dataItem.sk.S.startsWith("friend#cur")) {
      const friendId = dataItem.sk.S.split("friend#cur#")[1];
      friendIds.push(friendId);
      keys.push({
        pk: `u#${friendId}`,
        sk: `friend#cur#${userId}`,
      });
    }
    if (dataItem.sk.S.startsWith("friend#req#in")) {
      const friendId = dataItem.sk.S.split("friend#req#in#")[1];
      friendReqInIds.push(friendId);
      keys.push({
        pk: `u#${friendId}`,
        sk: `friend#req#out#${userId}`,
      });
    }
    if (dataItem.sk.S.startsWith("friend#req#out")) {
      const friendId = dataItem.sk.S.split("friend#req#out#")[1];
      friendReqOutIds.push(friendId);
      keys.push({
        pk: `u#${friendId}`,
        sk: `friend#req#in#${userId}`,
      });
    }
  }
  return {
    userInfo: { selfSubs, name, email, friendIds, friendReqInIds, friendReqOutIds },
    keys,
  };
}

async function deleteNameFromIndex(userId, currentName) {
  const invokeNameIndexUpdater = {
    FunctionName: process.env.UPDATE_NAME_INDEX_FUNCTION_NAME,
    InvocationType: "Event",
    Payload: JSON.stringify({
      userId,
      currentName,
    }),
  };
  try {
    const response = await lambdaClient.send(
      new InvokeCommand(invokeNameIndexUpdater),
    );
    if (response.$metadata.httpStatusCode !== 202) {
      throw new Error(`Error updating name index for user ${userId}`);
    }
  } catch (error) {
    console.error("INTERNAL: Error updating name index for user:", error);
  }
}

async function tryNotifyClients(userId, userInfo) {
  const deletionNotifications = {
    senderId: userId,
    senderInfo: userInfo,
    notifications: {
      forFriends: {
        notificationType: "FriendRemoved",
        data: {
          userId,
        },
      },
      forSelf: {
        notificationType: "SelfProfileDeleted",
      },
      forFriendRequests: {
        notificationType: "FriendRequestRemoved",
        data: {
          userId,
        },
      },
    },
  };
  const params = {
    FunctionName: process.env.NOTIFY_CLIENT_FUNCTION_NAME,
    InvocationType: "Event",
    Payload: JSON.stringify(deletionNotifications),
  };
  try {
    const result = await lambdaClient.send(new InvokeCommand(params));
    if (result.$metadata.httpStatusCode !== 202) {
      throw new Error(
        `received non-202 status code from client notifier: ${result}`,
      );
    }
  } catch (error) {
    console.error("INTERNAL: Error invoking client notifier:", error);
  }
}
