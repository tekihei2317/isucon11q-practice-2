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
