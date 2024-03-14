import Express from "express";
import dotenv from "dotenv";
import connectDb from "./db/index.js";
import { app } from "./app.js";
dotenv.config({
  path: "./.env",
});

connectDb();
app.on("error", (error) => {
  console.log("ERR: ", error);
  throw error;
});
app.listen(process.env.Port, () => {
  console.log(`App is listen on port${process.env.Port}`);
});

/*
import {DB_NAME} from "./constant.js";
first approach for database connection
(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        app.on("error",(error)=>{
            console.log("ERR: ",error);
            throw error;
        })
        app.listen(process.env.Port,()=>{
            console.log(`App is listen on port${process.env.Port}`);
        })
    } catch (error) {
        
    }
})()
*/
