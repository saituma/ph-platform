CREATE TABLE IF NOT EXISTS "chat_groups" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "name" varchar(255) NOT NULL,
  "createdBy" integer NOT NULL REFERENCES "users"("id"),
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "chat_group_members" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "groupId" integer NOT NULL REFERENCES "chat_groups"("id"),
  "userId" integer NOT NULL REFERENCES "users"("id"),
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "chat_group_messages" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "groupId" integer NOT NULL REFERENCES "chat_groups"("id"),
  "senderId" integer NOT NULL REFERENCES "users"("id"),
  "content" varchar(500) NOT NULL,
  "contentType" message_type NOT NULL DEFAULT 'text',
  "mediaUrl" varchar(500),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
