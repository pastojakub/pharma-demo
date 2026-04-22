import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class FileDto {
  @IsOptional()
  id?: number;

  @IsOptional()
  drugCatalogId?: number;

  @IsOptional()
  orderRequestId?: number;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNotEmpty()
  size: number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @IsOptional()
  @IsDateString()
  updatedAt?: string;
}

export class CreateDrugDefinitionDto {
  @IsString()
  @IsNotEmpty({ message: 'Názov lieku je povinný.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Zloženie lieku je povinné.' })
  composition: string;

  @IsString()
  @IsNotEmpty({ message: 'Odporúčané dávkovanie je povinné.' })
  recommendedDosage: string;

  @IsString()
  @IsOptional()
  intakeInfo?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  files?: FileDto[];

  @IsString()
  @IsOptional()
  metadata?: string;
}
