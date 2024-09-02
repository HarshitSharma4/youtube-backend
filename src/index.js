import dotenv from "dotenv";
import connectDb from "./db/index.js";
import { app } from "./app.js";
// import path from 'path';
// import express from 'express';
// import { fileURLToPath } from 'url';

dotenv.config({
  path: "./.env",
});
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename); 
 connectDb();
app.on("error", (error) => {
  console.log("ERR: ", error);
  throw error;
});

// app.use(express.static(path.join(__dirname,"../public/dist")))
// app.get("*",(req,res)=>{
//   res.sendFile(path.join(__dirname,"../public/dist/index.html")) 
// });
app.listen(process.env.PORT, () => {
  console.log(`App is listen on port${process.env.PORT}`);
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
