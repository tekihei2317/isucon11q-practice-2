import express from "express";
import mysql from "mysql2/promise";
import { pool, RowDataPacket } from "../utils/database";
import { ErrorWithStatus, IsuCondition } from "../types";
import { getUserIdFromSession } from "../utils/auth";
const conditionLimit = 20;

interface GetIsuConditionsQuery extends qs.ParsedQs {
  start_time: string;
  end_time: string;
  condition_level: string;
}

interface GetIsuConditionResponse {
  jia_isu_uuid: string;
  isu_name: string;
  timestamp: number;
  is_sitting: boolean;
  condition: string;
  condition_level: string;
  message: string;
}

// ISUのコンディションをDBから取得
async function getIsuConditions(
  db: mysql.Connection,
  jiaIsuUUID: string,
  endTime: Date,
  conditionLevel: Set<string>,
  startTime: Date,
  limit: number,
  isuName: string
): Promise<GetIsuConditionResponse[]> {
  const [conditions] =
    startTime.getTime() === 0
      ? await db.query<IsuCondition[]>(
          "SELECT * FROM `isu_condition` WHERE `jia_isu_uuid` = ?" +
            "	AND `timestamp` < ?" +
            "	ORDER BY `timestamp` DESC",
          [jiaIsuUUID, endTime]
        )
      : await db.query<IsuCondition[]>(
          "SELECT * FROM `isu_condition` WHERE `jia_isu_uuid` = ?" +
            "	AND `timestamp` < ?" +
            "	AND ? <= `timestamp`" +
            "	ORDER BY `timestamp` DESC",
          [jiaIsuUUID, endTime, startTime]
        );

  let conditionsResponse: GetIsuConditionResponse[] = [];
  conditions.forEach((condition) => {
    if (conditionLevel.has(condition.condition_level)) {
      conditionsResponse.push({
        jia_isu_uuid: condition.jia_isu_uuid,
        isu_name: isuName,
        timestamp: condition.timestamp.getTime() / 1000,
        is_sitting: !!condition.is_sitting,
        condition: condition.condition,
        condition_level: condition.condition_level,
        message: condition.message,
      });
    }
  });

  if (conditionsResponse.length > limit) {
    conditionsResponse = conditionsResponse.slice(0, limit);
  }

  return conditionsResponse;
}

export async function getIsuCondition(
  req: express.Request<
    { jia_isu_uuid: string },
    unknown,
    never,
    GetIsuConditionsQuery
  >,
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

    const endTimeInt = parseInt(req.query.end_time, 10);
    if (isNaN(endTimeInt)) {
      return res.status(400).type("text").send("bad format: end_time");
    }
    const endTime = new Date(endTimeInt * 1000);
    if (!req.query.condition_level) {
      return res.status(400).type("text").send("missing: condition_level");
    }
    const conditionLevel = new Set(req.query.condition_level.split(","));

    const startTimeStr = req.query.start_time;
    let startTime = new Date(0);
    if (startTimeStr) {
      const startTimeInt = parseInt(startTimeStr, 10);
      if (isNaN(startTimeInt)) {
        return res.status(400).type("text").send("bad format: start_time");
      }
      startTime = new Date(startTimeInt * 1000);
    }

    const [[row]] = await db.query<(RowDataPacket & { name: string })[]>(
      "SELECT name FROM `isu` WHERE `jia_isu_uuid` = ? AND `jia_user_id` = ?",
      [jiaIsuUUID, jiaUserId]
    );
    if (!row) {
      return res.status(404).type("text").send("not found: isu");
    }

    const conditionResponse: GetIsuConditionResponse[] = await getIsuConditions(
      db,
      jiaIsuUUID,
      endTime,
      conditionLevel,
      startTime,
      conditionLimit,
      row.name
    );
    res.status(200).json(conditionResponse);
  } catch (err) {
    console.error(`db error: ${err}`);
    return res.status(500).send();
  } finally {
    db.release();
  }
}
