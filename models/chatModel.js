import database from '../config/database.js';

export const dbCreateChat = async ({ title = null, is_group = false, created_by, memberIds = [] }) => {
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const insertChatText = `INSERT INTO chats (title, is_group, created_by) VALUES ($1, $2, $3) RETURNING *`;
    const chatRes = await client.query(insertChatText, [title, is_group, created_by]);
    const chat = chatRes.rows[0];

    const insertMemberText = `INSERT INTO chat_users (chat_id, user_id, role) VALUES ($1, $2, $3)`;
    for (const uid of memberIds) {
      const role = uid === created_by ? 'admin' : 'member';
      await client.query(insertMemberText, [chat.id, uid, role]);
    }

    await client.query('COMMIT');
    return chat;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const dbGetChatById = async (chatId) => {
  const text = `SELECT * FROM chats WHERE id = $1`;
  const res = await database.query(text, [chatId]);
  return res.rows[0] || null;
};

export const dbGetChatMembers = async (chatId) => {
  const text = `SELECT u.id, u.name, u.email, cu.role, cu.joined_at
                FROM chat_users cu
                JOIN users u ON u.id = cu.user_id
                WHERE cu.chat_id = $1`;
  const res = await database.query(text, [chatId]);
  return res.rows;
};

export const dbIsUserInChat = async (chatId, userId) => {
  const text = `SELECT 1 FROM chat_users WHERE chat_id = $1 AND user_id = $2`;
  const res = await database.query(text, [chatId, userId]);
  return res.rowCount > 0;
};

export const dbGetChatsForUser = async (userId) => {
  const text = `SELECT c.*
                FROM chats c
                JOIN chat_users cu ON cu.chat_id = c.id
                WHERE cu.user_id = $1
                ORDER BY c.updated_at DESC`;
  const res = await database.query(text, [userId]);
  return res.rows;
};

export const dbAddMessage = async ({ chatId, senderId, content, message_type = 'text' }) => {
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const insertText = `INSERT INTO messages (chat_id, sender_id, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *`;
    const msgRes = await client.query(insertText, [chatId, senderId, content, message_type]);

    const updateChatText = `UPDATE chats SET updated_at = now() WHERE id = $1`;
    await client.query(updateChatText, [chatId]);

    await client.query('COMMIT');
    return msgRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const dbGetMessagesByChatId = async ({ chatId, limit = 50, before }) => {
  let text;
  let params;
  if (before) {
    const beforeVal = (before instanceof Date) ? before.toISOString() : before;
    text = `SELECT m.*, u.name as sender_name
            FROM messages m
            LEFT JOIN users u ON u.id = m.sender_id
            WHERE m.chat_id = $1 AND m.created_at < $2
            ORDER BY m.created_at DESC
            LIMIT $3`;
    params = [chatId, beforeVal, limit];
  } else {
    text = `SELECT m.*, u.name as sender_name
            FROM messages m
            LEFT JOIN users u ON u.id = m.sender_id
            WHERE m.chat_id = $1
            ORDER BY m.created_at DESC
            LIMIT $2`;
    params = [chatId, limit];
  }
  const res = await database.query(text, params);
  return res.rows;
};

export const dbAddUserToChat = async ({ chatId, userId, role = 'member' }) => {
  const text = `INSERT INTO chat_users (chat_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *`;
  const res = await database.query(text, [chatId, userId, role]);
  return res.rows[0] || null;
};

export const dbRemoveUserFromChat = async ({ chatId, userId }) => {
  const text = `DELETE FROM chat_users WHERE chat_id = $1 AND user_id = $2 RETURNING *`;
  const res = await database.query(text, [chatId, userId]);
  return res.rows[0] || null;
};

export const dbUpdateChatDetails = async ({ chatId, fields = {} }) => {
  const allowed = ['title', 'is_group'];
  const setClauses = [];
  const params = [];
  let i = 1;
  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) continue;
    setClauses.push(`${key} = $${i}`);
    params.push(fields[key]);
    i++;
  }
  if (setClauses.length === 0) return null;
  params.push(chatId);
  const text = `UPDATE chats SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`;
  const res = await database.query(text, params);
  return res.rows[0] || null;
};

export const dbDeleteChat = async (chatId) => {
  const text = `DELETE FROM chats WHERE id = $1 RETURNING *`;
  const res = await database.query(text, [chatId]);
  return res.rows[0] || null;
};
