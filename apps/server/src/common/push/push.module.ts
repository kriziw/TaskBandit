import { Global, Module } from "@nestjs/common";
import { PushDeliveryService } from "./push-delivery.service";

@Global()
@Module({
  providers: [PushDeliveryService],
  exports: [PushDeliveryService]
})
export class PushModule {}
