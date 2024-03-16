import Router from 'express'
import { getChannelStats, getChannelVideos } from '../controllers/dashboard.js'
import verifyJWT from "../middlewares/authentication.js"

const dashboardRouter = Router()

dashboardRouter.use(verifyJWT)
dashboardRouter.route("/stats").get(getChannelStats)
dashboardRouter.route("/videos").get(getChannelVideos)


export { dashboardRouter }