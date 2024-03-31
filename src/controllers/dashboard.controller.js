import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  //     TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  return res.status(200);
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
