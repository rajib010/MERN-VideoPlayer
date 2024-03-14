import mongoose, { Mongoose, isValidObjectId } from "mongoose";
import { uploadOnCloudinary, ApiError, ApiResponse, asyncHandler, deleteCloudinary } from "../utility/index.js"
import { Video, User, Like, Comment } from "../models/index.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    console.log(userId)
    const pipeline = [];
    if (query) {
        await pipeline.push({
            $search: {
                index: "search-videos"
            },
            text: {
                query: query,
                path: ["title", "description"]
            }
        })
    }
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(404, "Invalid object id")
        }
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        })
    }
    pipeline.push({
        $match: {
            isPublished: true
        }
    })
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        })
    } else {
        pipeline.push({
            $sort: {
                createdAt: -1
            }
        })
    }
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            userName: 1,
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )
    const videoAggregate = await Video.aggregate(pipeline)
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }
    const video = await Video.aggregatePaginate(videoAggregate, options)
    return res.status(200).json(new ApiResponse(200, video, "Videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }
    const videoFileLocalPath = req.files?.videoFile[0].path;
    const thubnailLocalPath = req.files?.thumbnail[0].path;
    if (!videoFileLocalPath) {
        throw new ApiError(404, "Video localpath is required")
    }
    if (!thubnailLocalPath) {
        throw new ApiError(404, "Video thumbnail path is required")
    }
    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thubnailLocalPath)
    if (!videoFile) {
        throw new ApiError(404, "Video File not found")
    }
    if (!thumbnail) {
        throw new ApiError(404, "Thumbnail not found")
    }
    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        owner: req.user?._id,
        isPublished: false
    })
    const videoUploaded = await Video.findById(video._id);
    if (!videoUploaded) {
        throw new ApiError(500, "videoUpload failed, please try again!!!")
    }
    return res.status(200).json(new ApiResponse(200, video, "Video has been uploaded succesfully.."))
})

const getVideosById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(404, "Invalid object ID")
    }
    if (!isValidObjectId(req.user?._id)) {
        throw new ApiError(404, " invalid user")
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [req.user?._id, "$subscribers.subscriber"]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ])

    if (!video) {
        throw new ApiError(400, "failed to fetch videos")
    }

    //add to watch history
    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    })
    return res.status(200).json(new ApiResponse(200, video[0], "video details fetched successfully"))
})

const updateAVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(404, "Invalid videoId")
    }
    if (!isValidObjectId(req.user?._id)) {
        throw new ApiError(404, "Invalid user id")
    }
    if (!(title && description)) {
        throw new ApiError(400, "Title and description cannot be empty")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only the owner can edit the videos")
    }
    const thumbnailToDelete = video.thumbnail.public_id
    const thumbnailLocalPath = req.file?.path

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail) {
        throw new ApiError(404, "Thumbnail not found")
    }
    const updatedVideo = await Video.findByIdAndUpdate(videoId, {
        $set: {
            title,
            description,
            thumbnail: {
                public_id: thumbnail.public_id,
                url: thumbnail.url
            }
        }
    },
        {
            new: true
        }
    )
    if (!updatedVideo) {
        throw new ApiError(500, "Couldnot update the video")
    }
    await deleteCloudinary(thumbnailToDelete)

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"))
})

const deleteAVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(404, "Invalid video Id")
    }
    const video = Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video doesnot exist")
    }
    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only the owner can delete the video");
    }
    const deletedVideo = await Video.findByIdAndDelete(video?._id);
    if (!deleteAVideo) {
        throw new ApiError(500, "Failed to delete the video, try again")
    }
    await deleteCloudinary(video.thumbnail.public_id)
    await deleteCloudinary(video.videoFile.public_id, "video")
    await Like.deleteMany({ video: videoId })
    await Comment.deleteMany({ video: videoId })

    return res.status(200).json(new ApiResponse(200, deletedVideo, "Video deleted successfully"))

})

export { getAllVideos, publishAVideo, getVideosById, updateAVideo }