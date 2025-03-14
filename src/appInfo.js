const db = require("./config/aws");
const {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  ScanCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dotenv = require('dotenv');

dotenv.config();


const TABLE_NAME = process.env.DYNAMODB_APPINFO_TABLE;

const createAppInfo = async (appInfo) => {
  try {
    const id = `ext-id-${uuidv4()}`;
    const { name, title, description, locale, pre_message, pre_action } = appInfo;

    if (!name || !title || !description || !locale || !pre_message || !pre_action) {
      throw new Error("Missing required fields");
    }
   
    const params = {
      TableName: TABLE_NAME,
      Item: marshall({
        id,
        name,
        title,
        description,
        locale,
        pre_message,
        pre_action,
        createdAt: new Date().toISOString(),
      }),
    };

    await db.send(new PutItemCommand(params));

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "AppInfo created successfully",
        data: {
            id,
            name,
            title,
            description,
            locale,
            pre_message,
            pre_action,
            createdAt: new Date().toISOString(),
          
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};

const getAllAppInfo = async () => {
  try {
    const params = {
      TableName: TABLE_NAME,
    };

    const result = await db.send(new ScanCommand(params));
    return result.Items.map((item) => unmarshall(item));
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};

const getAppInfoById = async (id) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: marshall({ id }),
    };

    const { Item } = await db.send(new GetItemCommand(params));
    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "AppInfo not found",
        }),
      };
    }

    return unmarshall(Item);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};

const updateAppInfoById = async (id, updatedFields) => {
  try {
    const { name, title, description, locale, pre_message, pre_action } = updatedFields;

    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (name !== undefined) {
      updateExpression.push("#name = :name");
      expressionAttributeNames["#name"] = "name";
      expressionAttributeValues[":name"] = name;
    }

    if (title !== undefined) {
      updateExpression.push("#title = :title");
      expressionAttributeNames["#title"] = "title";
      expressionAttributeValues[":title"] = title;
    }

    if (description !== undefined) {
      updateExpression.push("#description = :description");
      expressionAttributeNames["#description"] = "description";
      expressionAttributeValues[":description"] = description;
    }

    if (locale !== undefined) {
      updateExpression.push("#locale = :locale");
      expressionAttributeNames["#locale"] = "locale";
      expressionAttributeValues[":locale"] = locale;
    }

    if (pre_message !== undefined) {
      updateExpression.push("#pre_message = :pre_message");
      expressionAttributeNames["#pre_message"] = "pre_message";
      expressionAttributeValues[":pre_message"] = pre_message;
    }

    if (pre_action !== undefined) {
      updateExpression.push("#pre_action = :pre_action");
      expressionAttributeNames["#pre_action"] = "pre_action";
      expressionAttributeValues[":pre_action"] = pre_action;
    }

    if (updateExpression.length === 0) {
      throw new Error("No valid fields to update");
    }

    const params = {
      TableName: TABLE_NAME,
      Key: marshall({ id }),
      UpdateExpression: "SET " + updateExpression.join(", "),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ReturnValues: "ALL_NEW",
    };

    const { Attributes } = await db.send(new UpdateItemCommand(params));
    return unmarshall(Attributes);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};

const deleteAppInfoById = async (id) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: marshall({ id }),
    };

    await db.send(new DeleteItemCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "AppInfo deleted successfully",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};

module.exports = {
  createAppInfo,
  getAllAppInfo,
  getAppInfoById,
  updateAppInfoById,
  deleteAppInfoById,
};