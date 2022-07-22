import { RowDataPacket } from "mysql2/promise";

export interface PostIsuConditionRequest {
  is_sitting: boolean;
  condition: string;
  message: string;
  timestamp: number;
}

export class ErrorWithStatus extends Error {
  public status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

export interface IsuCondition extends RowDataPacket {
  id: number;
  jia_isu_uuid: string;
  timestamp: Date;
  is_sitting: number;
  condition: string;
  message: string;
  condition_level: string;
  created_at: Date;
}
