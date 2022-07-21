import express from "express";
import { pool, RowDataPacket } from "../utils/database";
import {
  isValidConditionFormat,
  calculateConditionLevel,
} from "../utils/isu-condition";
import { PostIsuConditionRequest } from "../types";

function isValidPostIsuConditionRequest(
  body: PostIsuConditionRequest[]
): body is PostIsuConditionRequest[] {
  return (
    Array.isArray(body) &&
    body.every((data) => {
      return (
        typeof data.is_sitting === "boolean" &&
        typeof data.condition === "string" &&
        typeof data.message === "string" &&
        typeof data.timestamp === "number"
      );
    })
  );
}

export async function storeIsuCondition(
  req: express.Request<
    { jia_isu_uuid: string },
    unknown,
    PostIsuConditionRequest[]
  >,
  res: express.Response
): Promise<any> {
  // TODO: 一定割合リクエストを落としてしのぐようにしたが、本来は全量さばけるようにすべき
  const dropProbability = 0.9;
  if (Math.random() <= dropProbability) {
    console.warn("drop post isu condition request");
    return res.status(202).send();
  }

  const db = await pool.getConnection();
  try {
    const jiaIsuUUID = req.params.jia_isu_uuid;

    const request = req.body;
    if (!isValidPostIsuConditionRequest(request) || request.length === 0) {
      return res.status(400).type("text").send("bad request body");
    }

    const [[{ cnt }]] = await db.query<(RowDataPacket & { cnt: number })[]>(
      "SELECT COUNT(*) AS `cnt` FROM `isu` WHERE `jia_isu_uuid` = ?",
      [jiaIsuUUID]
    );
    if (cnt === 0) {
      return res.status(404).type("text").send("not found: isu");
    }

    if (request.some((cond) => !isValidConditionFormat(cond.condition))) {
      return res.status(400).type("text").send("bad request body");
    }

    const parameters = request.map((cond) => {
      const timestamp = new Date(cond.timestamp * 1000);
      const [conditionLevel, Error] = calculateConditionLevel(cond.condition);

      return [
        jiaIsuUUID,
        timestamp,
        cond.is_sitting,
        cond.condition,
        cond.message,
        conditionLevel,
      ];
    });

    await db.query(
      "INSERT INTO `isu_condition`" +
        "	(`jia_isu_uuid`, `timestamp`, `is_sitting`, `condition`, `message`, `condition_level`)" +
        "	VALUES ?",
      [parameters]
    );

    return res.status(202).send();
  } catch (err) {
    console.error(`db error: ${err}`);
    return res.status(500).send();
  } finally {
    db.release();
  }
}
