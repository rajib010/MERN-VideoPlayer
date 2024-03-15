import { Router } from "express";
import verifyJWT from "../middlewares/authentication.js"
import { getLikedVideos, toggleCommentLike, toggleTweetLike, toggleVideoLike } from "../controllers/like.js";

const likeRouter = Router();
likeRouter.use(verifyJWT);

likeRouter.route("/toggle/v/:videoId").post(toggleVideoLike)
likeRouter.route("/toggle/t/:tweetId").post(toggleTweetLike)
likeRouter.route("/toggle/c/:commentId").post(toggleCommentLike)
likeRouter.route("/videos").get(getLikedVideos)

export {likeRouter}