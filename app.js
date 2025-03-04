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


const updatePostById = async (id, updatedPost) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { id: { S: id } },
    UpdateExpression: "SET #title = :title, #content = :content",
    ExpressionAttributeNames: {
      "#title": "title",
      "#content": "content",
    },
    ExpressionAttributeValues: {
      ":title": { S: updatedPost.title },
      ":content": { S: updatedPost.content },
    },
    ReturnValues: "ALL_NEW",
  };

  const result = await db.send(new UpdateItemCommand(params));
  return result.Attributes;
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