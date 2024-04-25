import { Router } from "express";
import {
  createTweet,
  deleteTweet,
  getChannelTweets,
  updateTweet,
} from "../controllers/tweet.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJwt); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createTweet);

router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);
router.route("/c/:channelId").get(getChannelTweets);

export default router;
