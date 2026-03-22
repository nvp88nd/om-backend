import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { ContentSystemService } from './content_system.service';
import { CreateBannerDto, UpdateBannerDto, CreateBannedKeywordDto } from './dto/content.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('content-system')
export class ContentSystemController {
  constructor(private readonly contentService: ContentSystemService) {}

  // Banners
  @Post('banners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createBanner(@Body() dto: CreateBannerDto) {
    return this.contentService.createBanner(dto);
  }

  @Get('banners')
  findAllBanners() {
    return this.contentService.findAllBanners();
  }

  @Get('banners/active')
  findActiveBanners(@Query('position') position: string) {
    return this.contentService.findActiveBannersByPosition(position);
  }

  @Patch('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateBanner(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBannerDto) {
    return this.contentService.updateBanner(id, dto);
  }

  @Delete('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeBanner(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.removeBanner(id);
  }

  // Banned Keywords
  @Post('keywords')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createKeyword(@Body() dto: CreateBannedKeywordDto) {
    return this.contentService.createKeyword(dto);
  }

  @Get('keywords')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAllKeywords() {
    return this.contentService.findAllKeywords();
  }

  @Delete('keywords/:keyword')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removeKeyword(@Param('keyword') keyword: string) {
    return this.contentService.removeKeyword(keyword);
  }
}
