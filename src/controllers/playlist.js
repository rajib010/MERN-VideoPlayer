import mongoose, { isValidObjectId } from "mongoose";
import { Playlist, Video } from "../models/index.js";
import { ApiError, ApiResponse, asyncHandler } from "../utility/index.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    if (!(name && description)) {
        throw new ApiError(400, "Name and description of playlist are required")
    }
    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })
    if (!playlist) {
        throw new ApiError(404, "Failed to create Playlist")
    }
    return res.status(200).json(new ApiResponse(200, playlist, "Playlist created successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    if (!(name && description)) {
        throw new ApiError(400, "Name and description are required field")
    }
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(404, "Invalid playlistId")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    if (playlist?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only owners can update their videos")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $set: {
                name,
                description
            }
        },
        {
            new: true
        }
    )
    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to update playlist")
    }
    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    if (playlist?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only owners can delete their playlist")
    }
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlist?._id)
    if (!deletedPlaylist) {
        throw new ApiError(500, "failed to delete playlist, try again")
    }
    return res.status(200).json(new ApiResponse(200, {}, "playlist deleted successfully"))
})

const addVideosToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if (!(isValidObjectId(playlistId) && isValidObjectId(videoId))) {
        throw new ApiError(400, "Invalid playlist and video id")
    }
    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)
    if (!(playlist && video)) {
        throw new ApiError(404, "Playlist or video not found")
    }
    if ((playlist?.owner.toString() && video?.owner.toString()) !== req.user?._id.toString()) {
        throw new ApiError(400, "Only owner can add videos to their playlist")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlist?._id,
        {
            $addToSet: {
                videos: videoId
            }
        },
        { new: true }
    )
    if (!updatedPlaylist) {
        throw new ApiError(500, "failed to update the playlist, try again")
    }
    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "succcessfully added video to playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { videoId, playlistId } = req.params
    if (!(isValidObjectId(videoId) && isValidObjectId(playlistId))) {
        throw new ApiError(400, "Invalid video or playlist id")
    }
    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    if ((playlist?.owner.toString() && video?.owner.toString()) !== req.user?._id.toSting()) {
        throw new ApiError(400, "Only the owners can remove video from playlist")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlist?._id,
        {
            $pull: {
                video: videoId
            }

        },
        {
            new: true
        })
    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to remove video, try again")
    }
    return res.status(200).json(new ApiResponse(200, {}, "video removed successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(404, "Invalid playlist Id")
    }
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    const playlistVideos = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $match: {
                "videos.isPublished": true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                owner: {
                    $first: "owner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner: {
                    userName: 1,
                    fullname: 1,
                    "avatar.url": 1
                }
            }
        }
    ])
    if (!playlistVideos) {
        throw new ApiError(500, "failed to get playlist by id")
    }
    return res.status(200).json(new ApiResponse(200, playlistVideos[0], "playlist fetched successfully"))
})

const getUserPlaylist = asyncHandler(async(req,res)=>{
    const {userId} = req.params
    if(!isValidObjectId(userId)){
        throw new ApiError(400,"Invalid user id")
    }
    const playlists = await Playlist.aggregate([
        {
            $match:{
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size:"$videos"
                },
                totalViews:{
                    $sum:"$videos.views"
                }
            }
        },
        {
            $project:{
                _id:1,
                name:1,
                description:1,
                totalVideos:1,
                totalViews:1,
                updatedAt:1
            }
        }
    ])
    if(!playlist){
        throw new ApiError(404,"failed to get user playlist")
    }
    return res.status(200).json(new ApiResponse(200, playlists,"user playlist fetched successfully"))
})

export { createPlaylist, updatePlaylist, deletePlaylist, addVideosToPlaylist, removeVideoFromPlaylist, getPlaylistById, getUserPlaylist }