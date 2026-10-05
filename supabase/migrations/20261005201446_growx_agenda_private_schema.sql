-- Dedicated calendar boundary. No credential is created or exposed by this migration.
-- The user enables LOGIN and sets the runtime password only in a secure handoff.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='growx_agenda_runtime') THEN
    RAISE EXCEPTION 'growx_agenda_runtime already exists; inspect before continuing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='growx_agenda') THEN
    RAISE EXCEPTION 'growx_agenda already exists; inspect before continuing';
  END IF;
END $$;
CREATE ROLE growx_agenda_runtime NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE SCHEMA growx_agenda AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA growx_agenda FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA growx_agenda TO growx_agenda_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA growx_agenda REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA growx_agenda REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE growx_agenda.items (
 id text PRIMARY KEY,
 payload jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 archived boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text NOT NULL
);
CREATE INDEX agenda_items_updated_at_idx ON growx_agenda.items(updated_at DESC);
CREATE TABLE growx_agenda.settings (
 id text PRIMARY KEY,
 payload jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0)
);
CREATE TABLE growx_agenda.history (
 id uuid PRIMARY KEY,
 item_id text NOT NULL,
 action text NOT NULL,
 title text NOT NULL,
 actor text NOT NULL,
 at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agenda_history_at_idx ON growx_agenda.history(at DESC);
CREATE TABLE growx_agenda.requests (
 id uuid PRIMARY KEY,
 fingerprint text NOT NULL,
 response jsonb NOT NULL,
 actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE growx_agenda.sessions (
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),
 person text NOT NULL CHECK(person IN ('fernando','jefferson','julio')),
 password_version text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 CHECK(expires_at>created_at)
);
CREATE INDEX agenda_sessions_expiry_idx ON growx_agenda.sessions(expires_at);
CREATE TABLE growx_agenda.login_attempts (
 key_hash text PRIMARY KEY CHECK(length(key_hash)=64),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 resets_at timestamptz NOT NULL
);
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='growx_agenda' LOOP
  EXECUTE format('ALTER TABLE growx_agenda.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE growx_agenda.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON growx_agenda.%I FROM PUBLIC, anon, authenticated, service_role',t);
  EXECUTE format('CREATE POLICY agenda_runtime_only ON growx_agenda.%I FOR ALL TO growx_agenda_runtime USING (true) WITH CHECK (true)',t);
 END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE ON growx_agenda.items,growx_agenda.settings,growx_agenda.requests TO growx_agenda_runtime;
GRANT SELECT,INSERT ON growx_agenda.history TO growx_agenda_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON growx_agenda.sessions,growx_agenda.login_attempts TO growx_agenda_runtime;
COMMENT ON SCHEMA growx_agenda IS 'Private Grow-X partner agenda; not exposed through the Supabase Data API.';
COMMENT ON ROLE growx_agenda_runtime IS 'Restricted agenda backend role. Credential and LOGIN activation require the approved secure user setup.';
