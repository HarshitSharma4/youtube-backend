import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishaVideo,
  togglePublishStatus,
  updateThumbnail,
} from "../controllers/video.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.route("/").get(getAllVideos);

router.route("/upload").post(
  verifyJwt,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishaVideo
);

router
  .route("/:videoId")
  .get(verifyJwt, getVideoById)
  .delete(verifyJwt, deleteVideo)
  .patch(verifyJwt, upload.single("thumbnail"), updateThumbnail);
router.route("/toggle/publish/:videoId").patch(verifyJwt, togglePublishStatus);

export default router;
