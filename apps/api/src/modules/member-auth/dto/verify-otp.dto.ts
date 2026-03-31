import { IsString, Length, Matches } from 'class-validator'

export class VerifyOtpDto {
  @IsString()
  @Matches(/^0[0-9]{9}$/)
  phone!: string

  @IsString()
  tenantId!: string

  @IsString()
  @Length(6, 6)
  code!: string
}