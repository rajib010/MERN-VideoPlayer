import { ApiError } from "../utility/ApiError"
import { asyncHandler } from "../utility/AsyncHandler.js"
import { jwt } from "jsonwebtoken"
import { User } from "../models/User.models.js"

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")   //for mobile apps also
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})