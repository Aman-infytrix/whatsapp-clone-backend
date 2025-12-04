import catchAsync from "../utils/catchAsync.js";
import {
  dbCreateUser,
  dbGetUserByEmail,
  dbGetUserById,
  dbUpdateUserDetails,
  dbDeleteUser,
} from "../models/userModel.js";
import { dbGetAllUsers } from "../models/userModel.js";

import AppError from "../utils/appError.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const sendToken = (user, statusCode, res) => {
  const token = signToken(user.id);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

export const createUser = catchAsync(async (req, res, next) => {
  const { name, email, dob, password } = req.body;

  if (!name || !email || !dob || !password) {
    return next(
      new AppError(400, "Name, Email, DOB and Password are required!")
    );
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;

  if (!passwordRegex.test(password)) {
    return next(
      new AppError(
        400,
        "Password must be 8–16 chars, include uppercase, lowercase, number & special char."
      )
    );
  }

  const existingUser = await dbGetUserByEmail(email);
  if (existingUser) {
    return next(new AppError(400, "A user with this email already exists."));
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = await dbCreateUser(name, email, dob, hashedPassword);

  sendToken(newUser, 201, res);
});

export const loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError(400, "Email and Password are required."));
  }

  const user = await dbGetUserByEmail(email);
  if (!user) return next(new AppError(401, "Invalid email or password."));

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch)
    return next(new AppError(401, "Invalid email or password."));

  sendToken(user, 200, res);
});

export const logoutUser = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully.",
  });
};

export const getUser = catchAsync(async (req, res, next) => {
  const id = req.user?.id;
  if (!id) return next(new AppError(400, "User ID is required."));

  const user = await dbGetUserById(id);
  if (!user) return next(new AppError(404, "User not found."));

  res.status(200).json({
    status: "success",
    data: { user },
  });
});

export const listUsers = catchAsync(async (req, res, next) => {
  const users = await dbGetAllUsers();
  res.status(200).json({ status: "success", results: users.length, data: { users } });
});

export const updateUser = catchAsync(async (req, res, next) => {
  const id = req.user?.id;
  const updateFields = req.body;

  if (!id) return next(new AppError(400, "User ID is required."));
  if (Object.keys(updateFields).length === 0)
    return next(new AppError(400, "Please provide fields to update."));

  const allowedFields = ["name", "email", "dob", "password"];
  for (const key of Object.keys(updateFields)) {
    if (!allowedFields.includes(key)) {
      return next(new AppError(400, `Invalid field: ${key}`));
    }
  }

  if (updateFields.password) {
    updateFields.password = await bcrypt.hash(updateFields.password, 12);
  }

  const updatedUser = await dbUpdateUserDetails(id, updateFields);
  if (!updatedUser) return next(new AppError(404, "User not found."));

  res.status(200).json({
    status: "success",
    data: { user: updatedUser },
  });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  const id = req.user?.id;
  if (!id) return next(new AppError(400, "User ID is required."));

  const user = await dbGetUserById(id);
  if (!user) return next(new AppError(404, "User not found."));

  await dbDeleteUser(id);

  res.status(200).json({
    status: "success",
    message: "User deleted successfully.",
  });
});
