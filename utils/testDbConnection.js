import database from "./database.js"
import catchAsync from "./catchAsync.js";

const testDbConnection = catchAsync( async () => {
    const res = await database.query("SELECT NOW()");
    console.log("Connected! Time:", res.rows[0]);
});

testDbConnection();

export default testDbConnection;