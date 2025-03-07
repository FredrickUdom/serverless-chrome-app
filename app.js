const db = require("./config/aws");
const {
  ScanCommand,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");
const dotenv = require('dotenv');
const { v4: uuidv4 } = require("uuid");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
dotenv.config();

const TABLE_NAME = "PostsTableNew";


const createPost = async (post) => {
  try {
    
    let body = typeof post === "string" ? JSON.parse(post) : post;

    const rating = body.rating;
    if (rating === undefined || rating < 1 || rating > 5) {
      throw new Error("Rating must be a number between 1 and 5.");
    }

    const predefinedAnswers = body.predefinedAnswers || [];
    if (!Array.isArray(predefinedAnswers)) {
      throw new Error("predefinedAnswers must be an array");
    }

    predefinedAnswers.forEach((question, index) => {
      if (!question.questionId || !question.question || !question.options) {
        throw new Error(`Invalid structure for question at index ${index}`);
      }
    });

    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const params = {
      TableName: TABLE_NAME,
      Item: marshall({
        id,
        predefinedAnswers,
        customReason: body.customReason || "",
        rating: body.rating,
        createdAt: timestamp,
      }),
    };

    await db.send(new PutItemCommand(params));

    const getParams = {
      TableName: TABLE_NAME,
      Key: marshall({ id }),
    };

    const { Item } = await db.send(new GetItemCommand(getParams));

    // const unmarshalledItem = unmarshall(Item);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Successfully added feedback.",
        data: Item,
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

const getAllPosts = async () => {
  const params = {
    TableName: TABLE_NAME,
  };

  const result = await db.send(new ScanCommand(params));
  return result.Items;
};

// Get a post by ID
const getPostById = async (id) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { id: { S: id } },
  };

  const result = await db.send(new GetItemCommand(params));
  return result.Item;
};


const updatePostById = async (event) => {
  try {
    // Parse the request body
    const postId = event.pathParameters?.id;
    if (!postId) {
      throw new Error("Post ID is required");
    }

    let body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    // Check if post exists
    const getParams = {
      TableName: TABLE_NAME,
      Key: marshall({ id: postId }),
    };

    const { Item } = await db.send(new GetItemCommand(getParams));
    
    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Post not found",
        }),
      };
    }

    // Validate rating
    if (body.rating !== undefined) {
      if (body.rating < 1 || body.rating > 5) {
        throw new Error("Rating must be a number between 1 and 5.");
      }
    }

    // Validate predefinedAnswers if present
    if (body.predefinedAnswers !== undefined) {
      if (!Array.isArray(body.predefinedAnswers)) {
        throw new Error("predefinedAnswers must be an array");
      }

      body.predefinedAnswers.forEach((question, index) => {
        if (!question.questionId || !question.question || !question.options) {
          throw new Error(`Invalid structure for question at index ${index}`);
        }
      });
    }

    // Get the existing item and merge with updates
    const existingItem = unmarshall(Item);
    
    // Prepare update expression
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    // Update fields only if they are provided in the request
    if (body.rating !== undefined) {
      updateExpression.push("#rating = :rating");
      expressionAttributeNames["#rating"] = "rating";
      expressionAttributeValues[":rating"] = body.rating;
    }
    
    if (body.customReason !== undefined) {
      updateExpression.push("#customReason = :customReason");
      expressionAttributeNames["#customReason"] = "customReason";
      expressionAttributeValues[":customReason"] = body.customReason;
    }
    
    if (body.predefinedAnswers !== undefined) {
      updateExpression.push("#predefinedAnswers = :predefinedAnswers");
      expressionAttributeNames["#predefinedAnswers"] = "predefinedAnswers";
      expressionAttributeValues[":predefinedAnswers"] = body.predefinedAnswers;
    }
    
    // Add updatedAt timestamp
    updateExpression.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();
    
    // If no fields to update, return early
    if (updateExpression.length === 1) { // Only updatedAt
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "No valid fields to update",
        }),
      };
    }

    // Perform the update
    const params = {
      TableName: TABLE_NAME,
      Key: marshall({ id: postId }),
      UpdateExpression: "SET " + updateExpression.join(", "),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ReturnValues: "ALL_NEW",
    };

    const result = await db.send(new UpdateItemCommand(params));
    const updatedItem = unmarshall(result.Attributes);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Successfully updated feedback.",
        data: updatedItem,
      }),
    };
  } catch (error) {
    console.error("Error updating post:", error);
    return {
      statusCode: error.name === "ResourceNotFoundException" ? 404 : 400,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};


const deletePostById = async (id) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { id: { S: id } },
  };

  await db.send(new DeleteItemCommand(params));
  return { id };
};

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  updatePostById,
  deletePostById,
};