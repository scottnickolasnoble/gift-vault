-- Gift Vault database tables.
-- The server runs this every time it starts. "IF NOT EXISTS" means it only
-- creates what's missing, so it never wipes your data.

CREATE TABLE IF NOT EXISTS users (
	id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name          text NOT NULL,
	email         text NOT NULL UNIQUE,
	password_hash text NOT NULL,
	created_at    timestamptz NOT NULL DEFAULT now()
);

-- One row per signed-in device. The cookie holds a random token;
-- we only store a hash of it, so a database leak can't be used to log in.
CREATE TABLE IF NOT EXISTS sessions (
	token_hash text PRIMARY KEY,
	user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS people (
	id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name         text NOT NULL,
	relationship text NOT NULL DEFAULT '',
	birthday     text NOT NULL DEFAULT '',   -- "YYYY-MM-DD" or empty
	colour       text NOT NULL DEFAULT 'rust',
	grp          text NOT NULL DEFAULT 'other', -- family / friends / work / other
	sizes        text NOT NULL DEFAULT '',
	fav_colour   text NOT NULL DEFAULT '',
	loves        text NOT NULL DEFAULT '',
	avoid        text NOT NULL DEFAULT '',
	created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS people_user_idx ON people(user_id);

CREATE TABLE IF NOT EXISTS occasions (
	id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name       text NOT NULL,
	date       text NOT NULL,                -- "MM-DD", repeats every year
	budget     numeric(10,2),                -- NULL means no budget set
	type       text NOT NULL DEFAULT 'group' CHECK (type IN ('person', 'group')),
	created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS occasions_user_idx ON occasions(user_id);

-- Who is in each occasion. Deleting a person or an occasion removes the link.
CREATE TABLE IF NOT EXISTS occasion_people (
	occasion_id uuid NOT NULL REFERENCES occasions(id) ON DELETE CASCADE,
	person_id   uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
	PRIMARY KEY (occasion_id, person_id)
);

CREATE TABLE IF NOT EXISTS ideas (
	id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	person_id    uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
	name         text NOT NULL,
	note         text NOT NULL DEFAULT '',
	heard_on     text NOT NULL DEFAULT '',   -- "YYYY-MM-DD" or empty
	price        numeric(10,2),              -- NULL means no price
	link         text NOT NULL DEFAULT '',
	status       text NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'bought', 'wrapped', 'given')),
	occasion_key text,                       -- an occasion id, 'birthday', or NULL for "any time"
	created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ideas_user_idx ON ideas(user_id);

-- V3.1: Christmas is built in. Every account has exactly one, and it can't be deleted.
ALTER TABLE occasions ADD COLUMN IF NOT EXISTS builtin boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS occasions_one_builtin_per_user ON occasions(user_id) WHERE builtin;
