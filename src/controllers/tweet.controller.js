import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose from "mongoose";

const createTweet = asyncHandler(async (req, res) => {
  //get userid from verifyjwt and content
  const { content } = res.body;
  const userId = req.user._id;
  if (!content) throw new ApiError(401, "content is required");
  const tweet = await Tweet.create({
    owner: userId,
    content,
  });
  if (!tweet) throw new ApiError(500, "tweet not created successfully");
  const sendTweet = await Tweet.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(tweet._id),
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
    throw new ApiError(500, "tweet not created successfully");
  return res
    .status(200)
    .json(new ApiResponce(200, sendTweet[0], "Tweet created Successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const userId = req.params;
  if (!userId) throw new ApiError(401, "user id is not present");
  const sendTweet = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
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
  return res
    .status(200)
    .json(new ApiResponce(200, sendTweet, "get user tweet Successfully"));
});
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = res.params;
  if (!tweetId) throw new ApiError(402, "Tweet id is required");
  const istweet = await Tweet.findById(tweetId);
  if (!istweet) throw new ApiError(401, "tweet id is invalid");
  if (istweet.owner !== req.user._id)
    throw new ApiError(405, "User is not Authenticated to delete tweet");
  const tweet = await Tweet.findByIdAndDelete(tweetId);
  return res
    .status(200)
    .json(new ApiResponce(200, {}, "Tweet deleted Successfully"));
});
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = res.params;
  const { content } = res.body;

  if (!tweetId) throw new ApiError(402, "Tweet id is required");
  const istweet = await Tweet.findById(tweetId);
  if (!istweet) throw new ApiError(401, "tweet id is invalid");
  if (istweet.owner !== req.user._id)
    throw new ApiError(405, "User is not Authenticated to delete tweet");

  const tweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        owner: req.user._id,
        content,
      },
    },
    { new: true }
  );
  const sendTweet = await Tweet.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(tweetId),
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
  if (!sendComent?.length) throw new ApiError(500, "tweet not  successfully");

  return res
    .status(200)
    .json(new ApiResponce(200, sendTweet, "Tweet updated Successfully"));
});

export { createTweet, deleteTweet, getUserTweets, updateTweet };
