import express from "express";
import * as chatController from "../controllers/chatController.js";
import authHandler from "../middlewares/authHandler.js";

const router = express.Router();

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Create a new chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               is_group:
 *                 type: boolean
 *               members:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Chat created successfully
 */
router.post("/", authHandler, chatController.createChat);

/**
 * @swagger
 * /chat:
 *   get:
 *     summary: Get all chats for current user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of chats retrieved
 */
router.get("/", authHandler, chatController.getUserChats);

/**
 * @swagger
 * /chat/{chatId}:
 *   get:
 *     summary: Get chat details
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chat details retrieved
 *       404:
 *         description: Chat not found
 */
router.get("/:chatId", authHandler, chatController.getChat);

/**
 * @swagger
 * /chat/{chatId}/messages:
 *   post:
 *     summary: Send a message in chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               message_type:
 *                 type: string
 *                 enum: [text, image, audio, video]
 *             required: [content]
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post("/:chatId/messages", authHandler, chatController.sendMessage);

/**
 * @swagger
 * /chat/{chatId}/messages:
 *   get:
 *     summary: Get messages in chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of messages to fetch (max 200, default 50)
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fetch messages before this timestamp
 *     responses:
 *       200:
 *         description: Messages retrieved
 */
router.get("/:chatId/messages", authHandler, chatController.getMessages);

/**
 * @swagger
 * /chat/{chatId}/members:
 *   post:
 *     summary: Add user to chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *             required: [userId]
 *     responses:
 *       200:
 *         description: User added to chat
 */
router.post("/:chatId/members", authHandler, chatController.addUserToChat);

/**
 * @swagger
 * /chat/{chatId}/members:
 *   delete:
 *     summary: Remove user from chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *             required: [userId]
 *     responses:
 *       200:
 *         description: User removed from chat
 */
router.delete("/:chatId/members", authHandler, chatController.removeUserFromChat);

/**
 * @swagger
 * /chat/{chatId}:
 *   patch:
 *     summary: Rename chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *             required: [title]
 *     responses:
 *       200:
 *         description: Chat renamed successfully
 */
router.patch("/:chatId", authHandler, chatController.renameChat);

/**
 * @swagger
 * /chat/{chatId}:
 *   delete:
 *     summary: Delete chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chat deleted successfully
 */
router.delete("/:chatId", authHandler, chatController.deleteChat);

export default router;
