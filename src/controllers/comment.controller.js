import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import mongoose from "mongoose";
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;
  if (!content) throw new ApiError(402, "content is required");
  const comment = await Comment.create({
    content: content,
    video: videoId,
    owner: userId,
  });
  if (!comment) throw new ApiError(500, "comment is not created");
  const sendComent = await Comment.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(comment._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "userDetail",
        pipeline: [
          {
            $project: {
              fullName: 1,
              userName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        userDetail: {
          $first: "userDetail",
        },
      },
    },
  ]);
  if (!sendComent?.length)
    throw new ApiError(500, "comments not created successfully");
  console.log(sendComent);
  return res
    .status(200)
    .json(new ApiResponce(200, sendComent[0], "comment created successfully"));
});
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId) throw new ApiError(400, "comment id is required");
  const isComment = await Comment.findById(commentId);
  if (!isComment) throw new ApiError(401, "comment id is invalid");
  if (isComment.owner !== req.user._id)
    throw new ApiError(402, "user is not Authenticated to delete this comment");
  const comment = await Comment.findByIdAndDelete(commentId);
  console.log(comment);
  return res
    .status(200)
    .json(new ApiResponce(200, {}, "comment delete successfully"));
});
const getVideoComments = asyncHandler(async (req, res) => {
  //:Todo:check again with mongosePaginate
  const { videoId } = req.params;
  if (!videoId) throw new ApiError(400, "video id is required");
  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "userDetail",
      },
    },
    {
      $project: {
        content: 1,
        userDetail: 1,
        video: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponce(200, comments, "comments fetch successfully"));
});
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const content = req.body;
  if (!commentId) throw new ApiError(400, "comment id is required");
  const updateComment = await Comment.findByIdAndUpdate(commentId, {
    $set: {
      content,
    },
  });
  const sendComent = await Comment.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(commentId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "userDetail",
      },
    },
    {
      $project: {
        content: 1,
        userDetail: 1,
        video: 1,
      },
    },
  ]);
  if (!sendComent?.length)
    throw new ApiError(500, "comments not created successfully");
  console.log(sendComent);
  return res
    .status(200)
    .json(new ApiResponce(200, sendComent[0], "comment created successfully"));
});
export { addComment, deleteComment, getVideoComments, updateComment };
