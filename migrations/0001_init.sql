CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  unit TEXT,
  sort_order INTEGER NOT NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE daily_entries (
  user_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  habit_values_json TEXT NOT NULL,
  today_review TEXT,
  tomorrow_plan TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, date_key),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE weekly_entries (
  user_id TEXT NOT NULL,
  week_key TEXT NOT NULL,
  score INTEGER NOT NULL,
  week_review TEXT,
  next_week_plan TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, week_key),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
