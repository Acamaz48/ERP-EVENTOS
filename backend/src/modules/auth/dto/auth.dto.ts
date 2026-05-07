// src/modules/auth/dto/auth.dto.ts

import { IsEmail, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  email!: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  email!: string;

  @IsString({ message: 'O código OTP é obrigatório.' })
  otpCode!: string;

  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres.' })
  newPassword!: string;
}