import { Controller, Post, Body, Get, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto, StudentSignupDto, StudentLoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('teacher-login')
  @HttpCode(HttpStatus.OK)
  async teacherLogin(@Body() loginDto: LoginDto) {
    return this.authService.teacherLogin(loginDto);
  }

  @Post('student/signup')
  async studentSignup(@Body() studentSignupDto: StudentSignupDto) {
    return this.authService.studentSignup(studentSignupDto);
  }

  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  async studentLogin(@Body() studentLoginDto: StudentLoginDto) {
    return this.authService.studentLogin(studentLoginDto);
  }

  @Get('verify')
  async verifyToken(@Headers('authorization') authorization: string) {
    const token = authorization?.replace('Bearer ', '');
    if (!token) {
      return { success: false, message: 'No token provided' };
    }
    return this.authService.verifyToken(token);
  }
}
