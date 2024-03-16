import { Router } from "express";
import { getUserChannelSubscribers, getSubscribedChannels, toggleSubscription } from "../controllers/subscription.js"
import verifyJWT from "../middlewares/authentication.js"
const subscriptionRouter = Router();

subscriptionRouter.use(verifyJWT)

subscriptionRouter.route("/c/:channelId")
    .get(getUserChannelSubscribers)
    .post(toggleSubscription)

subscriptionRouter.route("/u/:subscriberId")
    .get(getSubscribedChannels)

export { subscriptionRouter }