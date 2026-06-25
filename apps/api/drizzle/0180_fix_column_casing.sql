-- conversation_mutes was created with snake_case columns; Drizzle expects camelCase
ALTER TABLE conversation_mutes RENAME COLUMN user_id TO "userId";
ALTER TABLE conversation_mutes RENAME COLUMN thread_id TO "threadId";
ALTER TABLE conversation_mutes RENAME COLUMN muted_until TO "mutedUntil";
ALTER TABLE conversation_mutes RENAME COLUMN created_at TO "createdAt";
ALTER TABLE conversation_mutes RENAME COLUMN updated_at TO "updatedAt";

-- editedAt added in 0179 as edited_at; Drizzle expects camelCase
ALTER TABLE messages RENAME COLUMN edited_at TO "editedAt";
ALTER TABLE chat_group_messages RENAME COLUMN edited_at TO "editedAt";
ALTER TABLE conversation_messages RENAME COLUMN edited_at TO "editedAt";
