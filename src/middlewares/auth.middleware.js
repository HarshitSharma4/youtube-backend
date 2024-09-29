import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

const verifyJwt = asyncHandler(async (req, res, next) => {
  try {
    // Extract token from either cookies or Authorization header
    const token =
      req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    // If no token is provided, throw an unauthorized error
    if (!token) {
      throw new ApiError(401, "Unauthorized request, no access token provided");
    }

    // Verify the token using the secret
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Find the user associated with the token
    const user = await User.findById(decodedToken._id).select("-password -refreshToken");
    
    // If the user does not exist or is invalid, throw an error
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // Attach the user information to the request object
    req.user = user;

    // Proceed to the next middleware
    next();
  } catch (error) {
    // Handle JWT verification errors or other errors
    throw new ApiError(401, error.message || "Invalid access token");
  }
});

export { verifyJwt };
