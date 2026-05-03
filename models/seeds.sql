-- Insert Seed Data into `users` table
INSERT INTO users (username, email, password_hash, first_name, last_name, avatar_url, bio, theme, notifications_enabled, is_email_verified, created_at, updated_at)
VALUES 
    ('johndoe', 'john.doe@example.com', '$2b$12$Y6jhLOeIm2SNmZZDqt9LsOZbtu2I2GQBMN23w0gcfVjHV3MWtKHhG', 'John', 'Doe', 'https://example.com/avatars/john.png', 'Software engineer passionate about building SaaS products.', 'light', TRUE, TRUE, '2026-01-10 10:00:00', '2026-01-10 10:00:00'),
    ('janedoe', 'jane.doe@example.com', '$2b$12$Y6jhLOeIm2SNmZZDqt9LsOZbtu2I2GQBMN23w0gcfVjHV3MWtKHhG', 'Jane', 'Doe', 'https://example.com/avatars/jane.png', 'Product designer and illustrator.', 'dark', TRUE, TRUE, '2026-01-11 11:30:00', '2026-01-12 09:15:00'),
    ('alice_w', 'alice@example.com', '$2b$12$Y6jhLOeIm2SNmZZDqt9LsOZbtu2I2GQBMN23w0gcfVjHV3MWtKHhG', 'Alice', 'Williams', 'https://example.com/avatars/alice.png', 'Content marketer and strategist.', 'light', FALSE, TRUE, '2026-01-15 14:00:00', '2026-01-15 14:00:00'),
    ('bob_dev', 'bob@example.com', '$2b$12$Y6jhLOeIm2SNmZZDqt9LsOZbtu2I2GQBMN23w0gcfVjHV3MWtKHhG', 'Bob', 'Smith', 'https://example.com/avatars/bob.png', 'Backend developer in love with Rust and Go.', 'dark', TRUE, FALSE, '2026-02-01 08:00:00', '2026-02-01 08:00:00'),
    ('charlie_c', 'charlie@example.com', '$2b$12$Y6jhLOeIm2SNmZZDqt9LsOZbtu2I2GQBMN23w0gcfVjHV3MWtKHhG', 'Charlie', 'Chaplin', NULL, NULL, 'light', TRUE, TRUE, '2026-02-10 16:20:00', '2026-02-15 10:45:00'),
    ('diana_p', 'diana@example.com', '$2b$12$Y6jhLOeIm2SNmZZDqt9LsOZbtu2I2GQBMN23w0gcfVjHV3MWtKHhG', 'Diana', 'Prince', 'https://example.com/avatars/diana.png', 'Data enthusiast and analyst.', 'dark', FALSE, TRUE, '2026-02-14 09:00:00', '2026-02-14 09:00:00'),
    ('evan_r', 'evan@example.com', '$2b$12$Y6jhLOeIm2SNmZZDqt9LsOZbtu2I2GQBMN23w0gcfVjHV3MWtKHhG', 'Evan', 'Wright', NULL, 'Freelance writer.', 'light', TRUE, TRUE, '2026-02-20 17:10:00', '2026-02-20 17:10:00'),
    ('fiona_g', 'fiona@example.com', '$2b$12$Y6jhLOeIm2SNmZZDqt9LsOZbtu2I2GQBMN23w0gcfVjHV3MWtKHhG', 'Fiona', 'Gallagher', 'https://example.com/avatars/fiona.png', 'Digital nomad, writing code from anywhere.', 'dark', TRUE, FALSE, '2026-03-01 12:00:00', '2026-03-02 14:30:00'),
    ('george_h', 'george@example.com', '$2b$12$Y6jhLOeIm2SNmZZDqt9LsOZbtu2I2GQBMN23w0gcfVjHV3MWtKHhG', 'George', 'Harrison', 'https://example.com/avatars/george.png', 'Musician and developer.', 'light', TRUE, TRUE, '2026-03-05 13:15:00', '2026-03-05 13:15:00'),
    ('hannah_b', 'hannah@example.com', '$2b$12$Y6jhLOeIm2SNmZZDqt9LsOZbtu2I2GQBMN23w0gcfVjHV3MWtKHhG', 'Hannah', 'Baker', NULL, 'Customer success representative.', 'light', TRUE, TRUE, '2026-03-10 15:40:00', '2026-03-10 15:40:00');

-- Insert Seed Data into `user_tokens` table
INSERT INTO user_tokens (user_id, token, token_type, expires_at, created_at)
VALUES 
    (1, 'abc123xyz_verify_token_1', 'email_verify', '2026-05-10 12:00:00', '2026-05-03 10:00:00'),
    (2, 'abc123xyz_verify_token_2', 'password_reset', '2026-05-04 10:00:00', '2026-05-03 09:00:00'),
    (3, 'abc123xyz_verify_token_3', 'email_verify', '2026-05-10 12:00:00', '2026-05-03 10:00:00'),
    (4, 'abc123xyz_verify_token_4', 'email_verify', '2026-05-04 08:00:00', '2026-05-01 08:00:00'),
    (5, 'abc123xyz_verify_token_5', 'password_reset', '2026-05-05 15:00:00', '2026-05-03 11:00:00'),
    (6, 'abc123xyz_verify_token_6', 'email_verify', '2026-05-10 12:00:00', '2026-05-03 10:00:00'),
    (7, 'abc123xyz_verify_token_7', 'email_verify', '2026-05-10 12:00:00', '2026-05-03 10:00:00'),
    (8, 'abc123xyz_verify_token_8', 'password_reset', '2026-05-10 12:00:00', '2026-05-03 12:00:00'),
    (9, 'abc123xyz_verify_token_9', 'email_verify', '2026-05-10 12:00:00', '2026-05-03 10:00:00'),
    (10, 'abc123xyz_verify_token_10', 'email_verify', '2026-05-10 12:00:00', '2026-05-03 10:00:00');

-- Insert Seed Data into `sessions` table
INSERT INTO sessions (user_id, session_token, expires_at, created_at)
VALUES 
    (1, 'sess_tok_01a2b3c4d5', '2026-05-10 10:00:00', '2026-05-03 10:00:00'),
    (2, 'sess_tok_02b3c4d5e6', '2026-05-10 11:30:00', '2026-05-03 11:30:00'),
    (3, 'sess_tok_03c4d5e6f7', '2026-05-10 14:00:00', '2026-05-03 14:00:00'),
    (4, 'sess_tok_04d5e6f7a8', '2026-05-08 08:00:00', '2026-05-01 08:00:00'),
    (5, 'sess_tok_05e6f7a8b9', '2026-05-08 16:20:00', '2026-05-03 10:20:00'),
    (6, 'sess_tok_06f7a8b9c0', '2026-05-09 09:00:00', '2026-05-02 09:00:00'),
    (7, 'sess_tok_07a8b9c0d1', '2026-05-06 17:10:00', '2026-05-03 11:10:00'),
    (8, 'sess_tok_08b9c0d1e2', '2026-05-04 12:00:00', '2026-05-01 12:00:00'),
    (9, 'sess_tok_09c0d1e2f3', '2026-05-10 13:15:00', '2026-05-03 13:15:00'),
    (10, 'sess_tok_10d1e2f3g4', '2026-05-10 15:40:00', '2026-05-03 15:40:00');

-- Insert Seed Data into `user_activities` table
INSERT INTO user_activities (user_id, activity_type, activity_data, created_at)
VALUES 
    (1, 'user_login', '{"ip": "192.168.1.5", "device": "Chrome/Mac", "location": "Madrid, Spain"}', '2026-05-03 10:05:00'),
    (2, 'profile_update', '{"fields_changed": ["theme", "bio"], "source": "web"}', '2026-05-03 12:15:00'),
    (3, 'password_reset_request', '{"ip": "10.0.0.4", "source": "mobile"}', '2026-05-03 14:10:00'),
    (4, 'account_creation', '{"signup_method": "email", "campaign": "google_ads"}', '2026-05-01 08:00:00'),
    (5, 'user_login', '{"ip": "192.168.1.12", "device": "Firefox/Windows", "location": "Paris, France"}', '2026-05-03 10:22:00'),
    (6, 'email_verified', '{"verify_token": "abc123xyz_verify_token_6"}', '2026-05-02 09:05:00'),
    (7, 'user_login', '{"ip": "172.16.0.21", "device": "Safari/iPhone", "location": "Berlin, Germany"}', '2026-05-03 11:12:00'),
    (8, 'settings_change', '{"notifications": false, "source": "web"}', '2026-05-02 14:00:00'),
    (9, 'user_login', '{"ip": "192.168.1.42", "device": "Chrome/Mac", "location": "London, UK"}', '2026-05-03 13:18:00'),
    (10, 'user_login', '{"ip": "10.0.0.18", "device": "Safari/Mac", "location": "New York, USA"}', '2026-05-03 15:45:00');