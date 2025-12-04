import jwt from "jsonwebtoken";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

const authHandler = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const headerToken = header.startsWith("Bearer")
  ? header.split(" ")[1]
  : null;

    console.log(headerToken);

  const cookieToken = req.cookies && req.cookies.token ? req.cookies.token : null;

  const token = headerToken || cookieToken;

  if (!token) {
    return next(new AppError(401, 'Unauthorized: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return next(new AppError(401, 'Unauthorized: Invalid or expired token'));
  }
});

export default authHandler;