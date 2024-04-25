import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose from "mongoose";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user._id;
  console.log(content);
  if (!content) throw new ApiError(401, "content is required");
  const isTweet = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        content: content,
      },
    },
  ]);
  if (isTweet?.length) throw new ApiError(500, "tweet already Exist");

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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "like",
      },
    },
    {
      $addFields: {
        userDetail: {
          $first: "$userDetail",
        },
        isLikeByUser: {
          $cond: {
            if: { $in: [req.user?._id, "$like.likeBy"] },
            then: true,
            else: false,
          },
        },
        like: {
          $size: "$like",
        },
      },
    },
  ]);
  if (!sendTweet?.length)
    throw new ApiError(500, "tweet not created successfully");
  return res
    .status(200)
    .json(new ApiResponce(200, sendTweet[0], "Tweet created Successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) throw new ApiError(402, "Tweet id is required");
  const istweet = await Tweet.findById(tweetId);
  if (!istweet) throw new ApiError(401, "tweet id is invalid");
  if (istweet.owner.toString() !== req.user._id.toString())
    throw new ApiError(405, "User is not Authenticated to delete tweet");
  const tweet = await Tweet.findByIdAndDelete(tweetId);
  return res
    .status(200)
    .json(new ApiResponce(200, { tweet }, "Tweet deleted Successfully"));
});
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!tweetId) throw new ApiError(402, "Tweet id is required");
  const istweet = await Tweet.findById(tweetId);
  if (!istweet) throw new ApiError(401, "tweet id is invalid");

  if (istweet.owner.toString() !== req.user._id.toString())
    throw new ApiError(405, "User is not Authenticated to update tweet");

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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "like",
      },
    },
    {
      $addFields: {
        userDetail: {
          $first: "$userDetail",
        },
        isLikeByUser: {
          $cond: {
            if: { $in: [req.user?._id, "$like.likeBy"] },
            then: true,
            else: false,
          },
        },
        like: {
          $size: "$like",
        },
      },
    },
  ]);
  if (!sendTweet?.length) throw new ApiError(500, "tweet not  successfully");

  return res
    .status(200)
    .json(new ApiResponce(200, sendTweet[0], "Tweet updated Successfully"));
});
const getChannelTweets = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  console.log("chanel Id", channelId);
  if (!channelId) throw new ApiError(401, "user id is not present");
  const sendTweet = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "like",
      },
    },
    {
      $addFields: {
        userDetail: {
          $first: "$userDetail",
        },
        isLikeByUser: {
          $cond: {
            if: { $in: [req.user?._id, "$like.likeBy"] },
            then: true,
            else: false,
          },
        },
        like: {
          $size: "$like",
        },
      },
    },
  ]);
  if (!sendTweet.length)
    throw new ApiError(400, "channel id is invalid or user not have tweets");
  return res
    .status(200)
    .json(new ApiResponce(200, sendTweet, "get channel Tweet successfully"));
});

export { createTweet, deleteTweet, updateTweet, getChannelTweets };
