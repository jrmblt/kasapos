import { IsString, IsUUID, Matches } from 'class-validator'

export class RequestOtpDto {
  @IsString()
  @Matches(/^0[0-9]{9}$/, { message: 'เบอร์โทรไม่ถูกต้อง' })
  phone!: string

  @IsString()
  @IsUUID()
  tenantId!: string
}