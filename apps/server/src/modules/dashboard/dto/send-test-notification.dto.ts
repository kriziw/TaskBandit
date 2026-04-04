import { IsOptional, IsUUID } from "class-validator";

export class SendTestNotificationDto {
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;
}
