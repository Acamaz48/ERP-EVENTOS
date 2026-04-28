import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, name: string, pass: string) {
    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) {
      throw new BadRequestException('Email já cadastrado.');
    }

    const hashedPassword = await bcrypt.hash(pass, 10);
    // Gera OTP numérico de 6 dígitos
    const otpCode = randomInt(100000, 999999).toString(); 
    const otpExpires = new Date(Date.now() + 15 * 60000); // 15 minutos de validade

    await this.prisma.user.create({
      data: { email, name, password: hashedPassword, otpCode, otpExpires }
    });

    console.log(`[EMAIL SIMULADO] Código OTP para ${email}: ${otpCode}`);

    return { message: 'Usuário criado. Verifique seu email para o código OTP.' };
  }

  async verifyOtp(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user || user.otpCode !== code) {
      throw new UnauthorizedException('Código OTP inválido.');
    }

    if (user.otpExpires && user.otpExpires < new Date()) {
      throw new UnauthorizedException('Código OTP expirado.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, otpCode: null, otpExpires: null }
    });

    return { message: 'Conta verificada com sucesso. Você já pode fazer login.' };
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) throw new UnauthorizedException('Credenciais inválidas.');
    if (!user.isVerified) throw new UnauthorizedException('Conta não verificada. Valide seu OTP.');
    
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciais inválidas.');

    return this.generateToken(user.id, user.email);
  }

  async generateToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Salva o hash do refresh token no banco para invalidação futura (segurança)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken }
    });

    return { accessToken, refreshToken };
  }

  async validateRefreshToken(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshToken) throw new UnauthorizedException('Acesso negado.');

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) throw new UnauthorizedException('Refresh token inválido ou expirado.');

    return true;
  }

  async refreshToken(userId: string, rToken: string) {
    await this.validateRefreshToken(userId, rToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    // Adicione esta linha para satisfazer o TypeScript:
    if (!user) throw new UnauthorizedException('Usuário não encontrado.');
    
    return this.generateToken(user.id, user.email);
  }
}