import { asyncHandler, ApiError, ApiResponse } from "../utility/index.js";
import { Comment } from "../models/Comment.models.js"
import { Jwt } from "jsonwebtoken";
import mongoose from "mongoose";

const createComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content) {
        throw new ApiError(404, "Comment cannot be empty!!!!");
    }
    const comment = await Comment.create({
        content
    })
    const postedComment = await Comment.findById(comment._id);
    if (!postedComment) {
        throw new ApiError(500, "Couldnot register comment")
    }
    return res.status(200).json(new ApiResponse(200, postedComment, "Comment posted successfully"));
})