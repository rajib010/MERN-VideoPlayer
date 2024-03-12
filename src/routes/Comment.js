import { Router } from "express";
import { addComment, updateComment, getVideoComments, deleteComment } from "../controllers/Comment.js";
import verifyJWT from "../middlewares/authentication.js";
import {upload} from "../middlewares/multer.js"

const commentRouter = Router()
commentRouter.use(verifyJWT, upload.none())

commentRouter.route("/:videoId").get(getVideoComments).post(addComment);
commentRouter.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default commentRouter