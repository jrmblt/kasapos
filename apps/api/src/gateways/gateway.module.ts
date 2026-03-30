import { Global, Module } from '@nestjs/common'
import { KdsGateway } from './kds/kds.gateway'
import { QueueGateway } from './queue/queue.gateway'

@Global()
@Module({
  providers: [KdsGateway, QueueGateway],
  exports: [KdsGateway, QueueGateway],
})
export class GatewayModule { }