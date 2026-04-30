import { Controller, Post, Body, Get, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

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

  @UseGuards(JwtAuthGuard)
  @Get('dashboard-kpis')
  obterDadosProtegidos(@Request() req) {
    return { 
      mensagem: 'Se você está vendo isso, seu token é válido!',
      usuarioLogado: req.user // O req.user foi injetado pelo nosso jwt.strategy.ts
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