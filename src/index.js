import dotenv from "dotenv";
import dbConnection from "./db/index.js"
import { app } from "./app.js"

dotenv.config({
    path: "./.env"
});

const port = process.env.PORT
dbConnection()
    .then(() => {
        app.listen(`${port}` || 8000, () => {
            console.log(`App is running on PORT${port}`);
        })
    })
    .catch((e) => {
        console.log("MONGO DB Connection failed");
        process.exit(1);
    })
