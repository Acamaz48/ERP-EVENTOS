import { Controller, Post, Body, Get, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '@prisma/client';
import { 
  RegisterDto, 
  LoginDto, 
  VerifyOtpDto, 
  RefreshTokenDto, 
  ForgotPasswordDto, 
  ResetPasswordDto, 
  UpdateProfileDto 
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==========================================
  // 🔐 ROTAS DE AUTENTICAÇÃO E REGISTO
  // ==========================================

  @Post('register')
  register(@Body() dto: RegisterDto) {
    // Agora o dto é garantidamente um objeto com email, name e password validados.
    return this.authService.register(dto.email, dto.name, dto.password);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.code);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    // Corrigido para garantir que o cliente envia exatamente userId e refreshToken
    return this.authService.refreshToken(dto.userId, dto.refreshToken);
  }

  // ==========================================
  // 🔄 ROTAS DE RECUPERAÇÃO DE SENHA
  // ==========================================

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otpCode, dto.newPassword);
  }

  // ==========================================
  // 👤 ROTAS PROTEGIDAS (REQUEREM TOKEN)
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @Get('dashboard-kpis')
  obterDadosProtegidos(@Request() req: any) {
    return { 
      mensagem: 'Se está a ver isto, o seu token é válido e passou no JwtAuthGuard!',
      usuarioLogado: req.user // Contém userId, email e role.
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    // Ao usar UpdateProfileDto, se dto.name não for enviado, ele será undefined
    // e a nossa service saberá lidar com atualizações parciais sem quebrar o banco.
    return this.authService.updateProfile(req.user.userId, dto.name);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  deleteAccount(@Request() req: any) {
    // O ID do utilizador vem do token validado (req.user), impedindo que
    // um utilizador apague a conta de outro passando um ID falso no body.
    return this.authService.deleteAccount(req.user.userId);
  }

  // NOVO: Rota estritamente protegida para o Painel de Administração
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // APENAS utilizadores com cargo ADMIN podem aceder a esta rota
  @Get('users')
  getUsers() {
    return this.authService.getUsers();
  }
}