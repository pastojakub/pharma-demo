import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RejectRequestDto {
  @IsString()
  @IsNotEmpty()
  requestID: string;

  @IsString()
  @IsNotEmpty()
  pharmacyOrg: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
