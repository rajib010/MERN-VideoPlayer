import Router from "express"
import verifyJWT from "../middlewares/authentication";
import { getAllVideos, publishAVideo, getVideosById, updateAVideo, deleteAVideo, togglePublishStatus } from "../controllers/video.js";
import upload from "../middlewares/multer.js"


const videoRouter = Router();
videoRouter.use(verifyJWT)

videoRouter.route("/").get(getAllVideos)
    .post(verifyJWT, upload.fields([
        {
            name: "videoFiles",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]), publishAVideo)

videoRouter.route("/v/:videoId")
    .get(verifyJWT, getVideosById)
    .delete(verifyJWT, deleteAVideo)
    .patch(verifyJWT, upload.single("thumbnail"), updateAVideo);

videoRouter.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus)


export { videoRouter }