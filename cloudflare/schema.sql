-- D1 database; do not commit actual complaint records or exports.
CREATE TABLE IF NOT EXISTS staff (
 email TEXT PRIMARY KEY COLLATE NOCASE,
 department TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','manager','staff')),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE TABLE IF NOT EXISTS complaints (
 id TEXT PRIMARY KEY,
 category TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('접수','확인중','처리완료')),
 department TEXT NOT NULL DEFAULT '미배정',
 assignee TEXT,
 pii TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_assignee ON complaints(assignee,created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(department,created_at);
CREATE TABLE IF NOT EXISTS audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 complaint_id TEXT NOT NULL,
 actor TEXT NOT NULL,
 action TEXT NOT NULL,
 detail TEXT NOT NULL DEFAULT '',
 at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_complaint ON audit(complaint_id,at);
