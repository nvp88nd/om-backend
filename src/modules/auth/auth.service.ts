import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserSession } from './entities/user_sessions.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
    private readonly jwtService: JwtService,
  ) {}

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

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = this.userRepository.create({
      email,
      password_hash,
      full_name,
    });

    await this.userRepository.save(newUser);

    const tokens = await this.generateTokens(newUser);

    const { password_hash: _, ...userInfo } = newUser;
    return {
      message: 'Registration successful',
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
