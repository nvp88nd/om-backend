import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { BannedKeyword } from './entities/banned_keyword.entity';
import { CreateBannerDto, UpdateBannerDto, CreateBannedKeywordDto } from './dto/content.dto';

@Injectable()
export class ContentSystemService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    @InjectRepository(BannedKeyword)
    private readonly keywordRepository: Repository<BannedKeyword>,
  ) {}

  // Banner Management
  async createBanner(dto: CreateBannerDto) {
    const banner = this.bannerRepository.create(dto);
    return this.bannerRepository.save(banner);
  }

  async findAllBanners() {
    return this.bannerRepository.find();
  }

  async findActiveBannersByPosition(position: string) {
    return this.bannerRepository.find({
      where: { position, status: 1 },
    });
  }

  async findBannerById(id: string) {
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const banner = await this.findBannerById(id);
    Object.assign(banner, dto);
    return this.bannerRepository.save(banner);
  }

  async removeBanner(id: string) {
    const banner = await this.findBannerById(id);
    await this.bannerRepository.remove(banner);
    return { message: 'Banner removed' };
  }

  // Banned Keywords Management
  async createKeyword(dto: CreateBannedKeywordDto) {
    const existing = await this.keywordRepository.findOne({ where: { keyword: dto.keyword } });
    if (existing) throw new ConflictException('Keyword already exists');

    const keyword = this.keywordRepository.create(dto);
    return this.keywordRepository.save(keyword);
  }

  async findAllKeywords() {
    const keywords = await this.keywordRepository.find();
    return keywords.map(k => k.keyword);
  }

  async removeKeyword(keyword: string) {
    const result = await this.keywordRepository.delete({ keyword });
    if (result.affected === 0) throw new NotFoundException('Keyword not found');
    return { message: 'Keyword removed' };
  }

  async checkContent(content: string): Promise<boolean> {
    const keywords = await this.findAllKeywords();
    const lowerContent = content.toLowerCase();
    return keywords.some(k => lowerContent.includes(k.toLowerCase()));
  }
}
