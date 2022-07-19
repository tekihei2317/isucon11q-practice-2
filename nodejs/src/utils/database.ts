import mysql from "mysql2/promise";
export { RowDataPacket } from "mysql2/promise";

const dbinfo: mysql.PoolOptions = {
  host: process.env["MYSQL_HOST"] ?? "127.0.0.1",
  port: parseInt(process.env["MYSQL_PORT"] ?? "3306", 10),
  user: process.env["MYSQL_USER"] ?? "isucon",
  database: process.env["MYSQL_DBNAME"] ?? "isucondition",
  password: process.env["MYSQL_PASS"] || "isucon",
  connectionLimit: 10,
  timezone: "+09:00",
};

export const pool = mysql.createPool(dbinfo);
