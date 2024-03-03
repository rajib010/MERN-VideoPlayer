import { asyncHandler } from "../utility/AsyncHandler.js"
import { ApiError } from "../utility/ApiError.js"
import { User } from "../models/User.models.js"
import { uploadOnCloudinary, deleteCloudinaryImage } from "../utility/Cloudinary.js"
import { ApiResponse } from "../utility/ApiResponse.js"
import Jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Generating Refresh and Access token failed")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { userName, email, fullName, password } = req.body;
    console.log(email)
    if ([fullName, email, userName, password].some((field) =>
        field?.trim() === "")) {
        throw new ApiError(400, "All fields are compulsory");
    }
    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "Username or email already exists")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.avatar[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is missing");
    }
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Couldnot register the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, userName, password } = req.body;
    if (!(email || userName)) {
        throw new ApiError(400, "Email or username is required")
    }

    const user = await User.findOne({
        $or: [{ userName }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User doesnot exist");
    }

    // validate password
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }
    // generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedUser = User.findById(user._id).select("-password -refreshToken")

    //    to send the cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: loggedUser, accessToken, refreshToken
        }, "User Logged in Successfully"
        ))

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }, {
        new: true
    }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken // mobile users token can be selected from req.body
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request. wrong token")
    }
    try {
        const decodedToken = Jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken },
                "Access Token Refreshed"));

    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confPassword } = req.body;


    if (newPassword !== confPassword) {
        throw new ApiError(401, "Passwords donot match")
    }
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Password");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully!!"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully!!"));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body; //fields that are to be updated
    if (!(fullName || email)) {
        throw new ApiError(400, "Email and Username are both requried")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }).select("-password")

    return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar file is missing');
    }
    try {
        const uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);
        const user = await User.findById(req.user?._id);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        user.avatar = uploadedAvatar.url;
        const updatedUser = await user.save();
        deleteCloudinaryImage(user.avatar); // Delete the old avatar only after successful update
        res.status(200).json(
            new ApiResponse(200, updatedUser.toJSON({ select: '-password -refreshToken' }), 'Avatar updated successfully')
        );
    } catch (error) {
        throw new ApiError(500, "Avatar image updation failed" + error);
    }
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage not found");
    }
    try {
        const uploadedCoverImage = await uploadOnCloudinary(coverImageLocalPath);
        const user = await User.findById(req.user?._id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        user.avatar = uploadedCoverImage.url;
        const updatedUser = await user.save();
        deleteCloudinaryImage(user.avatar);
        res.status(200).json(
            new ApiResponse(200, updatedUser.toJSON({ select: '-password -refreshToken' }), 'CoverImage updated successfully')
        );

    } catch (error) {
        throw new ApiError(500, "CoverImage updation failed" + error);
    }
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { userName } = req.params;
    if (!userName) {
        throw new ApiError(404, "Username not found");
    }
    const channel = await User.aggregate([
        {
            $match: {
                userName: userName?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribed: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },   //if field use $sign
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscribersCount: 1,
                channelSubscribed: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) throw new ApiError(404, "Channel doesnot exist");

    return res.status(200).json(new ApiResponse(200, channel[0], "User channel fetched successfully"))
})

export {
    registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser,
    updateAccountDetails, updateUserAvatar, updateCoverImage, getUserChannelProfile
}