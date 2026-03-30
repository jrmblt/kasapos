import { IsString } from 'class-validator'

export class PayPromptPayDto {
  @IsString()
  orderId!: string
}