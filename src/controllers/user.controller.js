import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
const generateAcessTokenandRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAcessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating access token and refresh tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get data from user
  const { fullName, email, password, userName } = req.body;
  console.log("user Data :-{", fullName, email, password, userName);
  //validatation
  //first tutorial method
  if (
    [fullName, password, email, userName].some((fields) => fields.trim() === "")
  )
    throw new ApiError(400, "All fields are required");
  const existUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  console.log("Existing user", existUser);
  if (existUser) {
    throw new ApiError(409, "user with this email and user name already exist");
  }
  console.log("req.file object :->", req?.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;

  //const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  )
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required ");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  console.log("avatar :->", avatar);
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName,
  });
  console.log("user:->", user);
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering user");
  }
  return res
    .status(201)
    .json(new ApiResponce(200, createdUser, "User register Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;
  console.log("email->", email, "password->", password);
  if (!(userName || email))
    throw new ApiError(400, "User Name or Email required !!");
  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (!user) throw new ApiError(401, "User does not exist !!");
  console.log("user->", user);
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid user password");
  const { refreshToken, accessToken } = await generateAcessTokenandRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const option = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponce(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged in Successfully"
      )
    );
});
const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    { new: true }
  );
  const option = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponce(200, {}, "User Logged out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw ApiError(401, "unauthorized request");
  }
  try {
    const decodeToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodeToken._id);
    if (!user) throw new ApiError(401, "refresh token is Invalid");
    if (incomingRefreshToken !== user?.refreshToken)
      throw new ApiError(401, "refresh token is expired or used");
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAcessTokenandRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponce(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token is refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword)
    throw new ApiError(403, "confirm password is not match new password");
  try {
    console.log(res.user);
    const user = await User.findById(req.user?._id);
    if (!user) throw new ApiError(401, "user is not valid");
    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isOldPasswordCorrect)
      throw new ApiError(401, "Old password is Invalid");
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json(new ApiResponce(200, {}, "password is change Successfully"));
  } catch (error) {
    throw new ApiError(500, "change current Password is failed");
  }
});
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        userName: req.user.userName,
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
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        suscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
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
        subscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!user?.length) throw new ApiError(404, "channel does not exist !!");
  return res
    .status(200)
    .json(new ApiResponce(200, user[0], "current user fatch Successfully"));
});
const updateUserDetail = asyncHandler(async (req, res) => {
  const { fullName, email, userName } = req.body;
  console.log(fullName);
  if (!fullName || !email || !userName) {
    throw new ApiError(401, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
        userName,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponce(200, user, "Account detail updated Successfully"));
});
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) throw new ApiError(401, "Avatar file is missing");
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) throw new ApiError(500, "Error while uploading file");
  await deleteOnCloudinary(req.user?.avatar);
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponce(200, user, "Avatar image updated Successfully"));
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath)
    throw new ApiError(401, "cover Image file is missing");
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) throw new ApiError(500, "Error while uploading file");
  console.log(req.user);
  await deleteOnCloudinary(req.user?.coverImage);
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponce(200, user, "cover image updated Successfully"));
});
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { userName } = req.params;
  console.log("user name ->", userName);
  if (!userName?.trim()) throw new ApiError(401, "Username is missing");
  console.log("start aggregate");
  const channel = await User.aggregate([
    {
      $match: {
        userName: userName,
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
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        suscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
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
        subscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  console.log("done->", channel);
  if (!channel?.length) throw new ApiError(404, "channel does not exist !!");
  return res
    .status(200)
    .json(
      new ApiResponce(200, channel[0], "User channel fetch Successfully !!")
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
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
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  console.log("user with watch History :->", user);
  return res
    .status(200)
    .json(new ApiResponce(200, user[0], "Watch History fatch Successfully"));
});

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserAvatar,
  updateUserDetail,
  updateUserCoverImage,
  getUserWatchHistory,
  getUserChannelProfile,
};
