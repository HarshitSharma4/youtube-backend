import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";

const checkVideoAuth = async (videoId, owner) => {
  const isVideo = await Video.findById(videoId);
  if (!isVideo) throw new ApiError(200, "video id is invalid");
  console.log(owner, isVideo.owner);
  if (owner.toString() !== isVideo.owner.toString())
    throw new ApiError(200, "User is not authenticated");
  console.log(owner.toString(), isVideo.owner.toString());
  return isVideo;
};

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) throw new ApiError(400, "video id is required");
  const video = await checkVideoAuth(videoId, req.user._id);
  const deleteVideo = await deleteOnCloudinary(video.videoFile);
  console.log(deleteVideo);
  if (!deleteVideo) throw new ApiError(400, "video delete failed");
  const deleteThumbnail = await deleteOnCloudinary(video.thumbnail);
  if (!deleteThumbnail) console.log(400, "thumbnail delete failed");
  const deleteInDatabase = await Video.findByIdAndDelete(videoId);
  console.log(deleteInDatabase);
  return res
    .status(200)
    .json(new ApiResponce(200, {}, "video deleted successfully"));
});
const getAllVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);
  console.log(query);
  const aggregationPipeline = [
    {
      $match: {
        isPublished: true,
        ...(query && { $text: { $search: query } }),
        ...(userId && { owner: new mongoose.Types.ObjectId(userId) }),
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
    {
      $addFields: {
        createdBy: {
          $first: "$createdBy",
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
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) throw new ApiError(400, "video id is required");
  console.log(req.user._id);
  //remove videos
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { watchHistory: videoId },
  });
  //addvideos
  await User.findByIdAndUpdate(req.user._id, {
    $push: {
      watchHistory: {
        $each: [videoId],
        $position: 1,
      },
    },
  });

  console.log(videoId);
  console.log(
    await Video.findByIdAndUpdate(videoId, {
      $inc: {
        views: 1,
      },
    })
  );
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              suscribersCount: {
                $size: "$subscribers",
              },

              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              fullName: 1,
              userName: 1,
              suscribersCount: 1,
              isSubscribed: 1,
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
        foreignField: "video",
        as: "like",
      },
    },
    {
      $addFields: {
        isLikeByUser: {
          $cond: {
            if: { $in: [req?.user?._id, "$like.likeBy"] },
            then: true,
            else: false,
          },
        },
        like: {
          $size: "$like",
        },
        createdBy: {
          $first: "$createdBy",
        },
      },
    },
  ]);
  console.log(video);
  if (!video.length) throw new ApiError(401, "video id is Invalid");
  return res
    .status(200)
    .json(new ApiResponce(200, video[0], "video fetched Successfully"));
});
const publishaVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description)
    throw new ApiError(400, "title and description is required");
  console.log(req.files);
  const videoLocalPath = req.files?.videoFile[0].path;
  const thumbnailLocalPath = req.files?.thumbnail[0].path;
  if (!videoLocalPath) throw new ApiError(400, "video is required");
  if (!thumbnailLocalPath) throw new ApiError(400, "thumbnail is required");
  const videoFile = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!videoFile) throw new ApiError(402, "video is required");
  if (!thumbnail) throw new ApiError(401, "thumbnail is required");
  console.log("video file ->", videoFile);
  const publish = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoFile.duration,
    owner: req.user._id,
  });
  if (!publish) throw new ApiError(500, "could not save in database");

  return res
    .status(200)
    .json(new ApiResponce(200, publish, "video published Successfully"));
});
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) throw new ApiError(400, "video id is required");
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
    {
      $addFields: {
        createdBy: {
          $first: "$createdBy",
        },
      },
    },
  ]);
  if (!video.length) throw new ApiError(401, "video id is invalid");

  const toggleStatus = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video[0].isPublished,
      },
    },
    { new: true }
  );

  if (!toggleStatus) throw new ApiError(500, "Publish status is not toggled");
  return res
    .status(200)
    .json(
      new ApiResponce(
        200,
        { ...video[0], isPublished: toggleStatus.isPublished },
        "Publish status toggled Successfully"
      )
    );
});
const updateThumbnail = asyncHandler(async (req, res) => {
  console.log(req?.file);
  const { videoId } = req.params;
  const thumbnailLocalPath = req.file?.path;
  if (!thumbnailLocalPath) throw new ApiError(401, "Thumbnail file is missing");

  const isVideo = await checkVideoAuth(videoId, req.user._id);
  const thumbnail = await uploadOnCloudinary(avatarLocalPath);
  if (!thumbnail.url) throw new ApiError(500, "Error while uploading file");
  await deleteOnCloudinary(isVideo.thumbnail);
  const changeThumbnail = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        thumbnail: thumbnail.url,
      },
    },
    { new: true }
  );
  await deleteOnCloudinary(isVideo.thumbnail);
  return res
    .status(200)
    .json(
      new ApiResponce(200, changeThumbnail, "thumbnail is change successfully")
    );
});
export {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishaVideo,
  togglePublishStatus,
  updateThumbnail,
};
