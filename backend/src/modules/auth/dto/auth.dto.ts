// src/modules/auth/dto/auth.dto.ts

import { IsEmail, IsString, MinLength, IsOptional, IsUUID } from 'class-validator';

// ==========================================
// 🔐 DTOs DE AUTENTICAÇÃO E REGISTO
// ==========================================

export class RegisterDto {
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  email!: string;

  @IsString({ message: 'O nome deve ser um texto.' })
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
  name!: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  email!: string;

  @IsString({ message: 'A senha é obrigatória.' })
  password!: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  email!: string;

  @IsString({ message: 'O código OTP é obrigatório.' })
  code!: string;
}

export class RefreshTokenDto {
  @IsUUID('4', { message: 'O ID do utilizador deve ser um UUID válido.' })
  userId!: string;

  @IsString({ message: 'O refresh token é obrigatório.' })
  refreshToken!: string;
}

// ==========================================
// 🔄 DTOs DE RECUPERAÇÃO DE SENHA
// ==========================================

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

// ==========================================
// 👤 DTOs DE PERFIL DE UTILIZADOR
// ==========================================

export class UpdateProfileDto {
  // @IsOptional() garante que, se o utilizador não enviar o campo 'name',
  // o NestJS não lance um erro, permitindo atualizações parciais futuras (ex: mudar só a foto).
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto válido.' })
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
  name?: string;
}
