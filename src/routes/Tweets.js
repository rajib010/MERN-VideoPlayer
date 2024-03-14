import Router from "express"
import { getUserTweets, updateTweets, deleteTweets, createTweet } from "../controllers/tweets.js"
import verifyJWT from "../middlewares/authentication.js"

const tweetRouter = Router();

tweetRouter.use(verifyJWT);

tweetRouter.route("/").post(createTweet);
tweetRouter.route("/:tweetId").patch(updateTweets).delete(deleteTweets)
tweetRouter.route("/user/:userId").get(getUserTweets)

export default tweetRouter

