import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import mongoose, { connect } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) throw new ApiError(400, "channel id is requred");
  const isChannel = await User.findById(channelId);
  if (!isChannel) throw new ApiError(400, "channel id is invalid");
  const SubscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribed",
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
              subscribersCount: {
                $size: "$subscribers",
              },
            },
          },
          {
            $project: {
              fullName: 1,
              userName: 1,
              avatar: 1,
              subscribersCount: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        subscribed: {
          $first: "$subscribed",
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponce(
        200,
        SubscribedChannels,
        "SubscribedChannels are fetch successfully"
      )
    );
});
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  console.log(subscriberId);
  if (!subscriberId) throw new ApiError(400, "subscriber id is requred");
  const isChannel = await User.findById(subscriberId);
  if (!isChannel) throw new ApiError(400, "subscriber id is invalid");
  const Subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
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
              subscribersCount: {
                $size: "$subscribers",
              },
            },
          },
          {
            $project: {
              fullName: 1,
              userName: 1,
              avatar: 1,
              subscribersCount: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        subscribers: {
          $first: "$subscribers",
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponce(200, Subscribers, "Subscriber are fetch successfully")
    );
});
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user._id;
  if (!channelId) throw new ApiError(400, "channel id is requred");
  const isChannel = await User.findById(channelId);
  if (!isChannel) throw new ApiError(400, "channel id is invalid");
  const isSubscribed = await Subscription.aggregate([
    {
      $match: {
        $and: [
          { channel: new mongoose.Types.ObjectId(channelId) },
          { subscriber: new mongoose.Types.ObjectId(subscriberId) },
        ],
      },
    },
  ]);
  console.log(isSubscribed);
  if (!isSubscribed?.length) {
    const addSubcription = await Subscription.create({
      channel: channelId,
      subscriber: subscriberId,
    });
    if (!addSubcription)
      throw new ApiError(500, "subscription is not toggle successfully");
    return res
      .status(200)
      .json(new ApiResponce(200, {}, "Subscription is toggle successfully"));
  } else {
    const removeSubcription = await Subscription.findByIdAndDelete(
      isSubscribed[0]._id
    );
    if (!removeSubcription)
      throw new ApiError(500, "subscription is not toggle successfully");
    return res
      .status(200)
      .json(new ApiResponce(200, {}, "Subscription is toggle successfully"));
  }
});

export { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription };
