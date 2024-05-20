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
  let { page = 1, limit = 10, query, sortBy, sortType } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);
  console.log(query);
  const aggregationPipeline = [
    {
      $match: {
        ...(query && { $text: { $search: query } }),
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likes: {
          $size: "$likes",
        },
      },
    },
  ];

  if (sortBy && sortType) {
    const sortField = `${sortBy}`;
    const sortOrder = sortType === "asc" ? 1 : -1;
    aggregationPipeline.push({
      $sort: { [sortField]: sortOrder },
    });
  }

  const options = {
    page,
    limit,
  };
  const getVideoAggregate = Video.aggregate(aggregationPipeline);
  const videos = await Video.aggregatePaginate(getVideoAggregate, options);
  console.log(videos);
  if (!videos.docs.length) {
    throw new ApiError(500, "No videos found");
  }
  return res
    .status(200)
    .json(new ApiResponce(200, videos, "videos fetched Successfully"));
});
export { getChannelStats, getChannelVideos };
