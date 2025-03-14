const { STSClient } = require("@aws-sdk/client-sts");
const { fromTemporaryCredentials } = require("@aws-sdk/credential-providers");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const dotenv = require('dotenv');
dotenv.config();

const roleArn = process.env.AWS_ROLE_ARN;

const stsClient = new STSClient({ region: process.env.AWS_REGION || "us-east-1" });

const createCredentialsProvider = () => {
  return fromTemporaryCredentials({
    params: {
      RoleArn: roleArn,
      RoleSessionName: "SessionName",
      DurationSeconds: 3600, 
    },
    client: stsClient,
    refreshInterval: (55 * 60 * 1000), 
  });
};

const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: createCredentialsProvider(),
});

const db = DynamoDBDocumentClient.from(dynamoDbClient);


module.exports = db;