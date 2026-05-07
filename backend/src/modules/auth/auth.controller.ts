import { Controller, Post, Body, Get, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body.email, body.name, body.password);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: any) {
    return this.authService.verifyOtp(body.email, body.code);
  }

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  refresh(@Body() body: any) {
    return this.authService.refreshToken(body.userId, body.refreshToken);
  }

  // --- NOVAS ROTAS DE RECUPERAÇÃO ---

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otpCode, dto.newPassword);
  }

  // -----------------------------------

  @UseGuards(JwtAuthGuard)
  @Get('dashboard-kpis')
  obterDadosProtegidos(@Request() req) {
    return { 
      mensagem: 'Se você está vendo isso, seu token é válido!',
      usuarioLogado: req.user 
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Request() req, @Body() body: any) {
    return this.authService.updateProfile(req.user.userId, body.name);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  deleteAccount(@Request() req) {
    return this.authService.deleteAccount(req.user.userId);
  }
}