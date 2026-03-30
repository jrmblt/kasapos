import { IsEnum } from "class-validator";

const ALLOWED_STATUSES = ["CALLED", "DONE", "SKIPPED"] as const;
export type UpdatableQueueStatus = (typeof ALLOWED_STATUSES)[number];

export class UpdateTicketDto {
  @IsEnum(ALLOWED_STATUSES)
  status!: UpdatableQueueStatus;
}
