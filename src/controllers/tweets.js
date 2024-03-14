import mongoose, { isValidObjectId } from "mongoose";
import { Tweet, User } from "../models/index.js";
import { ApiError, ApiResponse, asyncHandler } from "../utility/index.js"


const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content) {
        throw new ApiError(404, "Content cannot be empty")
    }
    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })
    if (!tweet) {
        throw new ApiError(500, "Failed to post tweet, try again")
    }
    return res.status(200).json(new ApiResponse(200, tweet, "Tweet added successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
        throw new ApiError(404, "User not found")
    }
    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweets",
                as: "likeDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails"
                },
                ownerDetails: {
                    $first: "$ownerDetails"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user._id, "$likeDetails.likedBy"] },
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
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, tweets, "tweets fetched successfully"))

})

const deleteTweets = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only the owner can delete the tweet")
    }
    awaitTweet.findByIdAndDelete(tweetId)

    return res.status(200).json(new ApiResponse(200, tweet, "Tweet deleted successfully"));
})

const updateTweets = asyncHandler(async (req, res) => {
    const { content } = req.body
    const { tweetId } = req.params
    if (!content) {
        throw new ApiError(404, "Content cannot be empty")
    }
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Tweet id is not valid id")
    }
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "Only the owner can update the tweets")
    }
    const updatedTweet = await Tweet.findByIdAndUpdate(tweetId,
        {
            $set: {
                content
            }
        },
        {
            new: true
        }
    )
    if (!updatedTweet) {
        throw new ApiError(500, "Cannot update tweets, try again")
    }
    return res.status(200).json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"))
})

export { createTweet, getUserTweets, deleteTweets, updateTweets }