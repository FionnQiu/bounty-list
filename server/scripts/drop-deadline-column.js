import mysql from "mysql2/promise";
import { config } from "../src/config.js";

async function main() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
  });

  try {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'bounties'
         AND COLUMN_NAME = 'deadline'`,
      [config.db.database],
    );

    if (Number(rows?.[0]?.total) > 0) {
      await connection.execute("ALTER TABLE bounties DROP COLUMN deadline");
      console.log("Dropped column bounties.deadline.");
    } else {
      console.log("Column bounties.deadline does not exist, skipped.");
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
