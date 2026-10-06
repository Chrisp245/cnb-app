CREATE TABLE IF NOT EXISTS presence (
  grp   TEXT    NOT NULL,
  i     INTEGER NOT NULL,
  j     INTEGER NOT NULL,
  value INTEGER NOT NULL,
  PRIMARY KEY (grp, i, j)
);
