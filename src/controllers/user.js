import { asyncHandler } from "../utility/AsyncHandler.js"
import { ApiError } from "../utility/ApiError.js"
import User from "../models/User.models.js"
import { uploadOnCloudinary } from "../utility/Cloudinary.js"
import { ApiResponse } from "../utility/ApiResponse.js"


const registerUser = asyncHandler(async (req, res) => {
    const { userName, email, fullName, password } = req.body;
    console.log(email)
    if ([fullName, email, userName, password].some((field) =>
        field?.trim() === "")) {
        throw new ApiError(400, "All fields are compulsory");
    }
    const existedUser = User.findOne({
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


export { registerUser }