import mongoose, { Mongoose } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;
  if (!videoId || !playlistId)
    throw new ApiError(400, "video id and playlist id is required");
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(401, "playlist id is not valid");
  if (playlist.owner.toString() !== req.user._id.toString())
    throw new ApiError(402, "User is not authorized");
  console.log(playlist);
  console.log(
    playlist.videos.some((item) => {
      console.log(item.toString(), videoId.toString());
      return item.toString() === videoId.toString();
    })
  );
  if (playlist.videos.some((item) => item.toString() === videoId.toString()))
    throw new ApiError(400, "video already present in playlist");
  const addvideo = await Playlist.findByIdAndUpdate(playlistId, {
    $push: {
      videos: videoId,
    },
  });
  console.log("add videos", addvideo);
  if (!addvideo) throw new ApiError(500, "video is not added in playlist");
  res
    .status(200)
    .json(new ApiResponce(200, {}, "video added to playlist Successfully"));
});
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, discription } = req.body;
  console.log(name, discription);
  const owner = req.user._id;
  if (!name || !discription)
    throw new ApiError(400, "name and discription is required");
  const isPlaylist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(owner),
        name: name,
      },
    },
  ]);
  if (isPlaylist?.length) throw new ApiError(401, "playlist already exist");
  const playlist = await Playlist.create({
    name,
    discription,
    owner,
  });
  if (!playlist) throw new ApiError(500, "Error while creating playlist ");
  return res
    .status(200)
    .json(new ApiResponce(200, playlist, "playlist created Successfully"));
});
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) throw new ApiError(400, "playlist id is required");
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(401, "playlist id is not valid");
  if (playlist.owner.toString() !== req.user._id.toString())
    throw new ApiError(402, "User is not authorized");
  const deletevideo = await Playlist.findByIdAndDelete(playlistId);
  console.log("delete videos", addVideo);
  if (!addvideo) throw new ApiError(500, "playlist delete failed");
  res
    .status(200)
    .json(new ApiResponce(500, {}, "delete playlist Successfully"));
});
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) throw new ApiError(400, "playlist id is required");
  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "playlistVideos",
        pipeline: [
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
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "creator",
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
        isUserOwner: {
          $eq: [new mongoose.Types.ObjectId(req.user._id), "$owner"],
        },
        creator: {
          $first: "$creator",
        },
      },
    },
  ]);
  if (!playlist.length) throw new ApiError(401, "playlist id is not valid");
  return res
    .status(200)
    .json(new ApiResponce(200, playlist[0], "playlist fetch Successfully"));
});
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) throw new ApiError(401, "userId is missing");
  const getPlaylists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "playlistVideos",
        pipeline: [
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
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "creator",
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
        owner: {
          $first: "$creator",
        },
      },
    },
  ]);
  console.log(getPlaylists);
  return res
    .status(200)
    .json(
      new ApiResponce(200, getPlaylists, "User's playlist fetch Successfully")
    );
});
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;
  if (!videoId || !playlistId)
    throw new ApiError(400, "video id and playlist id is required");
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(401, "playlist id is not valid");
  if (playlist.owner.toString() !== req.user._id.toString())
    throw new ApiError(402, "User is not authorized");
  const removeVideo = await Playlist.findByIdAndUpdate(playlistId, {
    $pull: {
      videos: videoId,
    },
  });
  console.log("remove videos", removeVideo);
  if (!removeVideo) throw new ApiError(500, "video is not removed in playlist");
  res
    .status(200)
    .json(new ApiResponce(200, {}, "video removed to playlist Successfully"));
});
const updatePlaylist = asyncHandler(async (req, res) => {
  const { name, discription } = req.body;
  const { playlistId } = req.params;
  if (!name || !discription)
    throw new ApiError(400, "name and discription is required");
  if (!playlistId) throw new ApiError(400, "playlist id is required");
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(401, "playlist id is not valid");
  if (playlist.owner.toString() !== req.user._id.toString())
    throw new ApiError(402, "User is not authorized");
  const update = await Playlist.findByIdAndUpdate(playlistId, {
    name,
    discription,
  });
  if (!update) throw new ApiError(500, "playlist is not updated");
  return res
    .status(200)
    .json(new ApiResponce(200, update, "playlist is updated Successfully"));
});
const videoPlaylistStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;
  if (!videoId) throw ApiError(400, "Video id is required");
  console.log(videoId);
  const playlist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $addFields: {
        isVideoPresent: {
          $in: [new mongoose.Types.ObjectId(videoId), "$videos"],
        },
      },
    },
  ]);
  console.log(playlist);
  if (!playlist.length) throw ApiError(402, "playlist is not present");

  return res
    .status(200)
    .json(new ApiResponce(200, playlist, "Playlist fetch Successfully"));
});
export {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
  videoPlaylistStatus,
};
//check already in playlist or not
