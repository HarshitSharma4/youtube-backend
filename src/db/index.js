import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDb = async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}${DB_NAME}`);
        console.log(`MongoDb is connected succesfully || DB HOST ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDb connection Failed Error::",error);
        process.exit(1);
    }
}
export default connectDb;