import express from "express";
import { pool, RowDataPacket } from "../utils/database";
import { getUserIdFromSession } from "../utils/auth";

export async function getIsuIcon(
  req: express.Request<{ jia_isu_uuid: string }>,
  res: express.Response
) {
  const db = await pool.getConnection();
  try {
    let jiaUserId: string;
    try {
      jiaUserId = await getUserIdFromSession(req, db);
    } catch (err) {
      if (err instanceof ErrorWithStatus && err.status === 401) {
        return res.status(401).type("text").send("you are not signed in");
      }
      console.error(err);
      return res.status(500).send();
    }

    const jiaIsuUUID = req.params.jia_isu_uuid;
    const [[row]] = await db.query<(RowDataPacket & { image: Buffer })[]>(
      "SELECT `image` FROM `isu` WHERE `jia_user_id` = ? AND `jia_isu_uuid` = ?",
      [jiaUserId, jiaIsuUUID]
    );
    if (!row) {
      return res.status(404).type("text").send("not found: isu");
    }
    return res.status(200).send(row.image);
  } catch (err) {
    console.error(`db error: ${err}`);
    return res.status(500).send();
  } finally {
    db.release();
  }
}
