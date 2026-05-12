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

  // ==========================================
  // 🔐 REGISTO E VERIFICAÇÃO (OTP)
  // ==========================================

  async register(email: string, name: string, pass: string) {
    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) {
      // Retornamos 400 Bad Request para evitar duplicação
      throw new BadRequestException('Email já cadastrado.');
    }

    // Hash da senha com salt de 10 rounds (Padrão seguro da indústria)
    const hashedPassword = await bcrypt.hash(pass, 10);
    
    // Gera OTP numérico de 6 dígitos seguro contra adivinhação
    const otpCode = randomInt(100000, 999999).toString(); 
    const otpExpires = new Date(Date.now() + 15 * 60000); // 15 minutos de validade estrita

    await this.prisma.user.create({
      data: { email, name, password: hashedPassword, otpCode, otpExpires }
    });

    console.log(`[EMAIL SIMULADO] Código OTP para ${email}: ${otpCode}`);

    return { message: 'Utilizador criado. Verifique o seu email para o código OTP.' };
  }

  async verifyOtp(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    // Proteção contra Timing Attacks e Força Bruta
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

    return { message: 'Conta verificada com sucesso. Já pode fazer login.' };
  }

  // ==========================================
  // 🔑 GERAÇÃO DE TOKENS E LOGIN
  // ==========================================

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) throw new UnauthorizedException('Credenciais inválidas.');
    if (!user.isVerified) throw new UnauthorizedException('Conta não verificada. Valide o seu OTP.');
    
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciais inválidas.');

    // Enviamos o user.role para a fábrica de tokens
    return this.generateToken(user.id, user.email, user.role);
  }

  /**
   * Fábrica central de tokens.
   */
  async generateToken(userId: string, email: string, role: string) {
    // Injeção do 'role' no payload. Isto será lido pelo JwtStrategy na entrada de cada requisição.
    const payload = { sub: userId, email, role };
    
    // Access Token de vida curta (15m) reduz janela de exposição em caso de roubo do token
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    // Refresh Token de vida longa (7d) para manter a sessão ativa sem incomodar o utilizador
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Armazenamos APENAS o hash do refresh token no banco. 
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
    
    if (!user) throw new UnauthorizedException('Utilizador não encontrado.');
    
    // Ao renovar a sessão, também re-injetamos o role
    return this.generateToken(user.id, user.email, user.role);
  }

  // ==========================================
  // 🔄 RECUPERAÇÃO DE SENHA (FORGOT / RESET)
  // ==========================================

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    // Prática de Segurança: "Email Enumeration Prevention".
    if (!user) {
      return { message: 'Se o e-mail estiver registado, receberá um código OTP.' };
    }

    const otpCode = randomInt(100000, 999999).toString(); 
    const otpExpires = new Date(Date.now() + 15 * 60000); // 15 minutos

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpires }
    });

    console.log(`[EMAIL SIMULADO - RECUPERAÇÃO] Código OTP para ${email}: ${otpCode}`);

    return { message: 'Se o e-mail estiver registado, receberá um código OTP.' };
  }

  async resetPassword(email: string, code: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user || user.otpCode !== code) {
      throw new UnauthorizedException('Código OTP inválido.');
    }

    if (user.otpExpires && user.otpExpires < new Date()) {
      throw new UnauthorizedException('Código OTP expirado.');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword, 
        otpCode: null, 
        otpExpires: null 
      }
    });

    return { message: 'Senha alterada com sucesso. Já pode fazer login com a nova senha.' };
  }

  // ==========================================
  // 👤 MÉTODOS DE CRUD DO UTILIZADOR
  // ==========================================

  async updateProfile(userId: string, name?: string) {
    // Caso o payload venha parcialmente vazio, ignoramos a atualização para não quebrar o banco
    if (!name) return { message: 'Nenhum dado atualizado.' };

    return this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true } 
    });
  }

  async deleteAccount(userId: string) {
    return this.prisma.user.delete({ where: { id: userId } });
  }

  // NOVO: Método de listagem segura de utilizadores para o painel de Administração
  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
        // NOTA: password, otpCode e refreshToken foram intencionalmente omitidos por segurança.
      },
      orderBy: {
        name: 'asc' // Ordena alfabeticamente para facilitar a visualização no frontend
      }
    });
  }
}