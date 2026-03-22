import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateAttributeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  values: string[];
}
