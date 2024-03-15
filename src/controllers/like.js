import mongoose, { isValidObjectId } from "mongoose";
import { Like, Tweet, Video } from "../models/index.js"
import { asyncHandler, ApiError, ApiResponse } from "../utility/index.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const likedAlready = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })
    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id)
        return res.status(200).json(new ApiResponse(200, { isLiked: false }))
    }
    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })
    return res.status(200).json(new ApiResponse(200, { isLiked: true }))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }
    const likedAlready = await Like.findOne({
        tweets: tweetId,
        likedBy: req.user?._id
    })
    if (likedAlready) {
        await Like.findByIdAndDelete(isTweetLiked?._id)
        return res.status(200).json(new ApiResponse(200, { isLiked: false }))
    }
    await Like.create({
        tweets: tweetId,
        likedBy: req.user?._id
    })
    return res.status(200).json(new ApiResponse(200, { isLiked: true }))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment ID")
    }
    const likedAlready = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id)
        return res.status(200).json(new ApiResponse(200, { isLiked: false }))
    }
    await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })
    return res.status(200).json(new ApiResponse(200, { isLiked: true }))
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideoAggregate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails"
                        }
                    },
                    {
                        $unwind: "$ownerDetails"
                    }
                ]
            }
        },
        {
            $unwind: "likedVideo"
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    descritpion: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        userName: 1,
                        fullName: 1,
                        "avatar.url": 1
                    }
                }
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, likedVideoAggregate, "liked videos fetched successfully"))
})

export { toggleVideoLike, toggleTweetLike, toggleCommentLike, getLikedVideos }