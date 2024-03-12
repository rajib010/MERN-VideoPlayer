import { asyncHandler, ApiError, ApiResponse } from "../utility/index.js";
import { Comment, Like, Video } from "../models/index.jsx";
import { Jwt } from "jsonwebtoken";
import mongoose from "mongoose";


// get existing comments in a video
const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found!!");
    }
    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
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
                        if: { $in: [req.user._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullname: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ]);
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };
    const comments = await Comment.aggregatePaginate(commentsAggregate, options);
    return res.status(200).json(new ApiResponse(200, comments, "Comments fetched successfully!!"));
})

// add comments to a video
const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body;

    if (!content) {
        throw new ApiError(404, "Comment cannot be empty!!!!");
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found!!")
    }
    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    });

    if (!comment) {
        throw new ApiError(500, "failed to post the comment")
    }
    return res.status(200).json(new ApiResponse(200, comment, "Comment posted successfully"));
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }
    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only comment owner can delete the comment");
    }
    await Comment.findByIdAndDelete(commentId);
    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user._id
    });

    return res.status(200).json(new ApiResponse(200, { commentId }, "Comment deleted successfully"))

})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    if (!content) {
        throw new ApiError(404, "comment is required")
    }
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }
    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only the owners can edit their comments")
    }
    const updatedComment = await Comment.findByIdAndUpdate(commentId,
        {
            $set: {
                content
            }
        },
        { new: true }
    )

    if (!updatedComment) {
        throw new ApiError(500, "failed to edit comment, try again")
    }

    return res.status(200).json(new ApiResponse(200, updatedComment, "comment updated succesfully"))
})

export { addComment, updateComment, getVideoComments, deleteComment }