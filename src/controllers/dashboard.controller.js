import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const stats = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "video",
              as: "likes",
            },
          },

          {
            $group: {
              _id: null,
              totalViews: { $sum: "$views" },
              totalLikes: { $sum: 1 },
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        totalSubscribers: {
          $size: "$subscribers",
        },
        totalLikes: { $first: "$video.totalLikes" },
        totalViews: { $first: "$video.totalViews" },
      },
    },
  ]);
  if (!stats.length) throw new ApiError(500, "stats can not calculated");
  return res
    .status(200)
    .json(new ApiResponce(200, stats[0], "stats fetch successfully"));
});
const getChannelVideos = asyncHandler(async (req, res) => {
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Schema.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "createdBy",
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
  ]);
  if (!videos.length) throw new ApiError(500, "videos is missing");
  return res
    .status(200)
    .json(new ApiResponce(200, videos, "video is fetch successfully"));
});

export { getChannelStats, getChannelVideos };
