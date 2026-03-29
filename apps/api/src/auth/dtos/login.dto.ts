import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator'

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string

  @IsString()
  @Length(4, 6)
  pin!: string
}

export class RefreshDto {
  @IsString()
  refreshToken!: string
}