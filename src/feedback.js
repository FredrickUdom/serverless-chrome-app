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


const TABLE_NAME = process.env.DYNAMODB_FEEDBACK_TABLE;

const createPost = async (post) => {
  try {
    let body = typeof post === "string" ? JSON.parse(post) : post;

    const rating = body.rating;
    if (rating === undefined || rating < 1 || rating > 5) {
      throw new Error("Rating must be a number between 1 and 5.");
    }

    const selectedOptions = body.selectedOptions || [];
    const customMessages = body.customMessages || {};

    if (!Array.isArray(selectedOptions)) {
      throw new Error("selectedOptions must be an array");
    }

    if (typeof customMessages !== "object" || Array.isArray(customMessages)) {
      throw new Error("customMessages must be an object");
    }

    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const params = {
      TableName: TABLE_NAME,
      Item: marshall({
        id,
        selectedOptions,
        customMessages,
        rating,
        createdAt: timestamp,
      }),
    };

    await db.send(new PutItemCommand(params));

    const getParams = {
      TableName: TABLE_NAME,
      Key: marshall({ id }),
    };

    const { Item } = await db.send(new GetItemCommand(getParams));

    const unmarshalledItem = unmarshall(Item);
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Successfully added feedback.",
        data: unmarshalledItem,
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


// const createPost = async (post) => {
//   try {
    
//     let body = typeof post === "string" ? JSON.parse(post) : post;

//     const rating = body.rating;
//     if (rating === undefined || rating < 1 || rating > 5) {
//       throw new Error("Rating must be a number between 1 and 5.");
//     }

//     const predefinedAnswers = body.predefinedAnswers || [];
//     if (!Array.isArray(predefinedAnswers)) {
//       throw new Error("predefinedAnswers must be an array");
//     }

//     predefinedAnswers.forEach((question, index) => {
//       if (!question.questionId || !question.question || !question.options) {
//         throw new Error(`Invalid structure for question at index ${index}`);
//       }
//     });

//     const id = uuidv4();
//     const timestamp = new Date().toISOString();

//     const params = {
//       TableName: TABLE_NAME,
//       Item: marshall({
//         id,
//         predefinedAnswers,
//         customReason: body.customReason || "",
//         rating: body.rating,
//         createdAt: timestamp,
//       }),
//     };

//     await db.send(new PutItemCommand(params));

//     const getParams = {
//       TableName: TABLE_NAME,
//       Key: marshall({ id }),
//     };

//     const { Item } = await db.send(new GetItemCommand(getParams));

//     // const unmarshalledItem = unmarshall(Item);

//     return {
//       statusCode: 201,
//       body: JSON.stringify({
//         message: "Successfully added feedback.",
//         data: Item,
//       }),
//     };
//   } catch (error) {
//     return {
//       statusCode: 400,
//       body: JSON.stringify({
//         error: error.message,
//       }),
//     };
//   }
// };


const getAllPosts = async () => {
  const params = {
    TableName: TABLE_NAME,
  };

  const result = await db.send(new ScanCommand(params));
  return result.Items;
};


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
    const postId = event.pathParameters?.id;
    if (!postId) {
      throw new Error("Post ID is required.");
    }

    let body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;


    const getParams = {
      TableName: TABLE_NAME,
      Key: marshall({ id: postId }),
    };

    const { Item } = await db.send(new GetItemCommand(getParams));

    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Post not found." }),
      };
    }

    if (body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
      throw new Error("Rating must be a number between 1 and 5.");
    }

    if (body.selectedOptions !== undefined && !Array.isArray(body.selectedOptions)) {
      throw new Error("selectedOptions must be an array.");
    }

    if (body.customMessages !== undefined && (typeof body.customMessages !== "object" || Array.isArray(body.customMessages))) {
      throw new Error("customMessages must be an object.");
    }

    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (body.rating !== undefined) {
      updateExpression.push("#rating = :rating");
      expressionAttributeNames["#rating"] = "rating";
      expressionAttributeValues[":rating"] = body.rating;
    }

    if (body.selectedOptions !== undefined) {
      updateExpression.push("#selectedOptions = :selectedOptions");
      expressionAttributeNames["#selectedOptions"] = "selectedOptions";
      expressionAttributeValues[":selectedOptions"] = body.selectedOptions;
    }

    if (body.customMessages !== undefined) {
      updateExpression.push("#customMessages = :customMessages");
      expressionAttributeNames["#customMessages"] = "customMessages";
      expressionAttributeValues[":customMessages"] = body.customMessages;
    }

    updateExpression.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    if (updateExpression.length === 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No valid fields to update." }),
      };
    }



    // Update the item

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
      body: JSON.stringify({ error: error.message }),
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