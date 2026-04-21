import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { User } from './entities/user.entity';
import { UserOtp } from './entities/user_otp.entity';
import { UserSession } from './entities/user_sessions.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
    @InjectRepository(UserOtp)
    private readonly userOtpRepository: Repository<UserOtp>,
    private readonly jwtService: JwtService,
    private readonly MailService: MailService,
  ) { }

  private async generateTokens(user: User) {
    const payload = { id: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Refresh token valid for 7 days

    await this.userSessionRepository.save({
      user_id: user.id,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    });

    return { accessToken, refreshToken };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, full_name } = registerDto;

    let user = await this.userRepository.findOne({ where: { email } });
    if (user && user.status === 1) {
      throw new BadRequestException('Email is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    if (user) {
      user.password_hash = password_hash;
      user.full_name = full_name;
      user = await this.userRepository.save(user);
    } else {
      user = this.userRepository.create({
        email,
        password_hash,
        full_name,
        status: 0, // Inactive until OTP is verified
      });
      user = await this.userRepository.save(user);
    }

    await this.userOtpRepository.update({ user_id: user.id, type: 'VERIFY_EMAIL' }, { is_used: true });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await this.userOtpRepository.save({
      user_id: user.id,
      code: otp,
      type: 'VERIFY_EMAIL',
      expires_at: expiresAt,
      is_used: false,
    });

    const mailSent = await this.MailService.sendVerificationEmail(user.email, otp);
    if (!mailSent) {
      throw new BadRequestException('Unable to send OTP email at this time');
    }

    return {
      message: 'Vui lòng xác thực email của bạn',
      email: user.email,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.status === 1) {
      throw new BadRequestException('Email is already verified');
    }

    const userOtp = await this.userOtpRepository.findOne({
      where: {
        user_id: user.id,
        code: otp,
        type: 'VERIFY_EMAIL',
        is_used: false,
      },
      order: { expires_at: 'DESC' },
    });

    if (!userOtp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (new Date() > userOtp.expires_at) {
      throw new BadRequestException('OTP has expired');
    }

    // Mark OTP as used
    userOtp.is_used = true;
    await this.userOtpRepository.save(userOtp);

    // Update user status
    user.status = 1;
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user);

    const { password_hash: _, ...userInfo } = user;
    return {
      message: 'Email verified successfully',
      user: userInfo,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 1) {
      throw new UnauthorizedException('Account is inactive or locked');
    }

    const tokens = await this.generateTokens(user);

    const { password_hash: _, ...userInfo } = user;
    return {
      message: 'Login successful',
      user: userInfo,
      ...tokens,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const { refresh_token } = refreshTokenDto;

    const session = await this.userSessionRepository.findOne({
      where: { refresh_token },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > session.expires_at) {
      await this.userSessionRepository.delete(session.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userRepository.findOne({ where: { id: session.user_id } });
    if (!user || user.status !== 1) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Delete old refresh token session and generate new ones
    await this.userSessionRepository.delete(session.id);
    const tokens = await this.generateTokens(user);

    return tokens;
  }

  async logout(userId: string) {
    // Optionally delete all sessions, or accept a specific token to delete
    await this.userSessionRepository.delete({ user_id: userId });
    return { message: 'Logged out successfully' };
  }
}
