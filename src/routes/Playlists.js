import { Router } from "express";
import {createPlaylist, updatePlaylist, deletePlaylist, addVideosToPlaylist, removeVideoFromPlaylist, getPlaylistById, getUserPlaylist} from "../controllers/playlist.js"
import {verifyJWT} from "../middlewares/authentication.js";
import upload from "../middlewares/multer.js"

const playlistRouter = Router();

playlistRouter.use(verifyJWT, upload.none());
playlistRouter.route("/").post(createPlaylist);
playlistRouter.route("/:playlistId").get(getPlaylistById)
                                    .patch(updatePlaylist)
                                    .delete(deletePlaylist)
playlistRouter.route("/add/:videoId/:playlistId").patch(addVideosToPlaylist)
playlistRouter.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist)
playlistRouter.route("/user/:userId").get(getUserPlaylist)

export {playlistRouter}