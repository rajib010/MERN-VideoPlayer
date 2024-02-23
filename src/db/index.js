import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"

const dbConnection = async function () {
    try {
        const response = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        if(response){
            console.log("DB connected successfully");
        }

    } catch (error) {
        console.log("Error in db connnection", error);
    }
}

export default dbConnection;