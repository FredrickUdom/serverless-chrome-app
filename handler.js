const {
  createPost,
  getAllPosts,
  getPostById,
  updatePostById,
  deletePostById,
} = require("./app");


const formatResponse = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
});

exports.createPost = async (event) => {
  try {
    const post = JSON.parse(event.body);
    const createdPost = await createPost(post);
    return formatResponse(201, createdPost);
  } catch (error) {
    return formatResponse(500, { error: error.message });
  }
};

exports.getAllPosts = async () => {
  try {
    const posts = await getAllPosts();
    return formatResponse(200, posts);
  } catch (error) {
    return formatResponse(400, { error: error.message });
  }
};

exports.getPostById = async (event) => {
  try {
    const id = event.pathParameters.id;
    const post = await getPostById(id);
    if (!post) {
      return formatResponse(404, { error: "Post not found" });
    }
    return formatResponse(200, post);
  } catch (error) {
    return formatResponse(500, { error: error.message });
  }
};

exports.updatePostById = async (event) => {
  try {
    const id = event.pathParameters?.id;
    const updatedPost = JSON.parse(event.body);
    const result = await updatePostById({ pathParameters: { id }, body: updatedPost });
    return formatResponse(200, result);
  } catch (error) {
    return formatResponse(500, { error: error.message });
  }
};

exports.deletePostById = async (event) => {
  try {
    const id = event.pathParameters.id;
    await deletePostById(id);
    return formatResponse(200, { message: "Post deleted successfully" });
  } catch (error) {
    return formatResponse(500, { error: error.message });
  }
};