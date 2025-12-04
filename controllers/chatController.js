import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import {
  dbCreateChat,
  dbGetChatById,
  dbGetChatMembers,
  dbIsUserInChat,
  dbGetChatsForUser,
  dbAddMessage,
  dbGetMessagesByChatId,
  dbAddUserToChat,
  dbRemoveUserFromChat,
  dbUpdateChatDetails,
  dbDeleteChat,
} from "../models/chatModel.js";

export const createChat = catchAsync(async (req, res, next) => {
  const creatorId = req.user?.id;
  if (!creatorId) return next(new AppError(401, "Unauthorized"));

  const { title = null, is_group = false, members = [] } = req.body;
  const memberIds = Array.isArray(members)
    ? Array.from(new Set([...members, creatorId]))
    : [creatorId];

  console.log(`[createChat] User ${creatorId} creating chat with members:`, memberIds);

  // For 1-to-1 chats, check if it already exists
  if (!is_group && memberIds.length === 2) {
    console.log(`[createChat] Checking for existing 1-to-1 chat with members: ${memberIds.join(', ')}`);
    const existingChats = await dbGetChatsForUser(creatorId);
    console.log(`[createChat] User ${creatorId} has ${existingChats.length} existing chats`);
    
    for (const chat of existingChats) {
      // Skip group chats
      if (chat.is_group) continue;
      
      // Get members of this chat
      const chatMembers = await dbGetChatMembers(chat.id);
      console.log(`[createChat] Checking chat ${chat.id}: has ${chatMembers.length} members`);
      
      // Check if it's a 1-to-1 chat with the same members (length should be 2)
      if (chatMembers.length === 2) {
        const memberIdsInChat = new Set(chatMembers.map((m) => m.id));
        const memberIdsToAdd = new Set(memberIds);
        
        // Check if both sets are identical
        if (
          memberIdsInChat.size === memberIdsToAdd.size &&
          Array.from(memberIdsInChat).every((id) => memberIdsToAdd.has(id))
        ) {
          // Found existing chat with same members
          console.log(`[createChat] ✅ Found existing 1-to-1 chat ${chat.id}, returning it`);
          return res.status(200).json({ status: "success", data: { chat } });
        }
      }
    }
  }

  console.log(`[createChat] Creating new chat with members: ${memberIds.join(', ')}`);
  const chat = await dbCreateChat({
    title,
    is_group,
    created_by: creatorId,
    memberIds,
  });

  console.log(`[createChat] ✅ New chat created with ID ${chat.id}`);
  res.status(201).json({ status: "success", data: { chat } });
});

export const getUserChats = catchAsync(async (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) return next(new AppError(401, "Unauthorized"));

  const chats = await dbGetChatsForUser(userId);

  res.status(200).json({ status: "success", data: { chats } });
});

export const getChat = catchAsync(async (req, res, next) => {
  const userId = req.user?.id;
  const chatId = Number(req.params.chatId);
  if (!userId) return next(new AppError(401, "Unauthorized"));

  const chat = await dbGetChatById(chatId);
  if (!chat) return next(new AppError(404, "Chat not found"));

  const isMember = await dbIsUserInChat(chatId, userId);
  if (!isMember) return next(new AppError(403, "Forbidden"));

  const members = await dbGetChatMembers(chatId);

  res.status(200).json({ status: "success", data: { chat, members } });
});

export const sendMessage = catchAsync(async (req, res, next) => {
  const senderId = req.user?.id;
  const chatId = Number(req.params.chatId);
  if (!senderId) return next(new AppError(401, "Unauthorized"));

  const { content, message_type = "text" } = req.body;
  if (!content && message_type === "text")
    return next(new AppError(400, "Message content required"));

  const chat = await dbGetChatById(chatId);
  if (!chat) return next(new AppError(404, "Chat not found"));

  const isMember = await dbIsUserInChat(chatId, senderId);
  if (!isMember) return next(new AppError(403, "Forbidden"));

  const message = await dbAddMessage({
    chatId,
    senderId,
    content,
    message_type,
  });

  res.status(201).json({ status: "success", data: { message } });
});

export const getMessages = catchAsync(async (req, res, next) => {
  const userId = req.user?.id;
  const chatId = Number(req.params.chatId);
  if (!userId) return next(new AppError(401, "Unauthorized"));

  const chat = await dbGetChatById(chatId);
  if (!chat) return next(new AppError(404, "Chat not found"));

  const isMember = await dbIsUserInChat(chatId, userId);
  if (!isMember) return next(new AppError(403, "Forbidden"));

  const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 50;
  const before = req.query.before ? new Date(req.query.before) : undefined;

  let messages = await dbGetMessagesByChatId({ chatId, limit, before });
  messages = messages.reverse();

  res.status(200).json({ status: "success", data: { messages } });
});

export const addUserToChat = catchAsync(async (req, res, next) => {
  const requesterId = req.user?.id;
  const chatId = Number(req.params.chatId);
  const { userId, role = "member" } = req.body;

  if (!requesterId) return next(new AppError(401, "Unauthorized"));
  if (!userId) return next(new AppError(400, "userId required"));

  const chat = await dbGetChatById(chatId);
  if (!chat) return next(new AppError(404, "Chat not found"));

  const isRequesterMember = await dbIsUserInChat(chatId, requesterId);
  if (!isRequesterMember) return next(new AppError(403, "Forbidden"));

  const added = await dbAddUserToChat({ chatId, userId, role });
  if (!added) return next(new AppError(400, "Could not add user"));

  res.status(200).json({ status: "success", data: { member: added } });
});

export const removeUserFromChat = catchAsync(async (req, res, next) => {
  const requesterId = req.user?.id;
  const chatId = Number(req.params.chatId);
  const { userId } = req.body;

  if (!requesterId) return next(new AppError(401, "Unauthorized"));
  if (!userId) return next(new AppError(400, "userId required"));

  const chat = await dbGetChatById(chatId);
  if (!chat) return next(new AppError(404, "Chat not found"));

  const isRequesterMember = await dbIsUserInChat(chatId, requesterId);
  if (!isRequesterMember) return next(new AppError(403, "Forbidden"));

  const removed = await dbRemoveUserFromChat({ chatId, userId });
  if (!removed) return next(new AppError(400, "Could not remove user"));

  res.status(200).json({ status: "success", data: { removed } });
});

export const renameChat = catchAsync(async (req, res, next) => {
  const requesterId = req.user?.id;
  const chatId = Number(req.params.chatId);
  const { title } = req.body;

  if (!requesterId) return next(new AppError(401, "Unauthorized"));
  if (!title || typeof title !== "string")
    return next(new AppError(400, "title required"));

  const chat = await dbGetChatById(chatId);
  if (!chat) return next(new AppError(404, "Chat not found"));

  const isMember = await dbIsUserInChat(chatId, requesterId);
  if (!isMember) return next(new AppError(403, "Forbidden"));

  const updated = await dbUpdateChatDetails({ chatId, fields: { title } });
  if (!updated) return next(new AppError(400, "Could not update chat"));

  res.status(200).json({ status: "success", data: { chat: updated } });
});

export const deleteChat = catchAsync(async (req, res, next) => {
  const requesterId = req.user?.id;
  const chatId = Number(req.params.chatId);

  if (!requesterId) return next(new AppError(401, "Unauthorized"));

  const chat = await dbGetChatById(chatId);
  if (!chat) return next(new AppError(404, "Chat not found"));

  const isMember = await dbIsUserInChat(chatId, requesterId);
  if (!isMember) return next(new AppError(403, "Forbidden"));

  const deleted = await dbDeleteChat(chatId);
  if (!deleted) return next(new AppError(400, "Could not delete chat"));

  res.status(200).json({ status: "success", message: "Chat deleted" });
});
