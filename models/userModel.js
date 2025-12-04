import database from "../config/database.js";

export const dbCreateUser = async (name, email, dob, hashPassword) => {
  const query = `
    INSERT INTO users (name, email, dob, password)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, dob, created_at;
  `;

  const values = [name, email, dob, hashPassword];

  const result = await database.query(query, values);
  return result.rows[0];
};

export const dbGetUserByEmail = async (email) => {
  const query = `
    SELECT id, name, email, dob, password, created_at
    FROM users
    WHERE email = $1;
  `;

  const values = [email];

  const result = await database.query(query, values);
  return result.rows[0];
};

export const dbGetUserById = async (id) => {
  const query = `
    SELECT id, name, email, dob, password, created_at
    FROM users
    WHERE id = $1;
  `;
  const result = await database.query(query, [id]);
  return result.rows[0];
};

export const dbUpdateUserDetails = async (userId, updateFields) => {
  const setClause = Object.keys(updateFields)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ');

  const values = [userId, ...Object.values(updateFields)];

  const query = `
    UPDATE users
    SET ${setClause}
    WHERE id = $1
    RETURNING id, name, email, dob, created_at;
  `;

  const result = await database.query(query, values);
  return result.rows[0];
};

export const dbDeleteUser = async (userId) => {
  const query = `
    DELETE FROM users
    WHERE id = $1;
  `;

  const values = [userId];

  await database.query(query, values);
};

export const dbGetAllUsers = async () => {
  const query = `
    SELECT id, name, email, dob, created_at
    FROM users
    ORDER BY created_at DESC;
  `;

  const result = await database.query(query);
  return result.rows;
};