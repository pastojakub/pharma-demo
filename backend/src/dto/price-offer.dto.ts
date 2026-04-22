import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class PriceOfferDto {
  @IsString()
  @IsNotEmpty()
  requestID: string;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsString()
  @IsNotEmpty()
  pharmacyOrg: string;
}
