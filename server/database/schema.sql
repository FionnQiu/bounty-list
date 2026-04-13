SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255) DEFAULT NULL,
  bio VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bounty_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bounties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  publisher_id INT NOT NULL,
  category_id INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  reward_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('recruiting', 'in_progress', 'pending_confirm', 'completed', 'closed') NOT NULL DEFAULT 'recruiting',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bounties_publisher FOREIGN KEY (publisher_id) REFERENCES users(id),
  CONSTRAINT fk_bounties_category FOREIGN KEY (category_id) REFERENCES bounty_categories(id)
);

CREATE TABLE IF NOT EXISTS bounty_applications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bounty_id INT NOT NULL,
  applicant_id INT NOT NULL,
  message TEXT NOT NULL,
  status ENUM('pending', 'contacting', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_bounty_applicant (bounty_id, applicant_id),
  CONSTRAINT fk_applications_bounty FOREIGN KEY (bounty_id) REFERENCES bounties(id),
  CONSTRAINT fk_applications_applicant FOREIGN KEY (applicant_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bounty_id INT NOT NULL,
  publisher_id INT NOT NULL,
  applicant_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_conversation_scope (bounty_id, publisher_id, applicant_id),
  CONSTRAINT fk_conversations_bounty FOREIGN KEY (bounty_id) REFERENCES bounties(id),
  CONSTRAINT fk_conversations_publisher FOREIGN KEY (publisher_id) REFERENCES users(id),
  CONSTRAINT fk_conversations_applicant FOREIGN KEY (applicant_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bounty_status_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bounty_id INT NOT NULL,
  from_status VARCHAR(32) NOT NULL,
  to_status VARCHAR(32) NOT NULL,
  actor_id INT NOT NULL,
  actor_role VARCHAR(24) NOT NULL,
  note VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_status_logs_bounty FOREIGN KEY (bounty_id) REFERENCES bounties(id),
  CONSTRAINT fk_status_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  INDEX idx_status_logs_bounty_created (bounty_id, created_at)
);

CREATE TABLE IF NOT EXISTS bounty_ratings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bounty_id INT NOT NULL,
  rater_id INT NOT NULL,
  target_user_id INT NOT NULL,
  score TINYINT NOT NULL,
  comment VARCHAR(200) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_bounty_rater (bounty_id, rater_id),
  CONSTRAINT fk_ratings_bounty FOREIGN KEY (bounty_id) REFERENCES bounties(id),
  CONSTRAINT fk_ratings_rater FOREIGN KEY (rater_id) REFERENCES users(id),
  CONSTRAINT fk_ratings_target FOREIGN KEY (target_user_id) REFERENCES users(id),
  CONSTRAINT chk_bounty_ratings_score CHECK (score BETWEEN 1 AND 5)
);

ALTER TABLE bounties
  MODIFY COLUMN status ENUM('open', 'draft', 'recruiting', 'in_progress', 'pending_confirm', 'completed', 'closed') NOT NULL DEFAULT 'recruiting';

UPDATE bounties
SET status = CASE
  WHEN status IN ('open', 'draft') THEN 'recruiting'
  ELSE status
END
WHERE status IN ('open', 'draft');

ALTER TABLE bounties
  MODIFY COLUMN status ENUM('recruiting', 'in_progress', 'pending_confirm', 'completed', 'closed') NOT NULL DEFAULT 'recruiting';

ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE bounty_categories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE bounties CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE bounty_applications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE conversations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE conversation_messages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE bounty_status_logs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE bounty_ratings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
