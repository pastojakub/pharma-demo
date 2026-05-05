import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class ApproveOfferDto {
  @IsString()
  @IsNotEmpty()
  requestID: string;

  @IsInt()
  @Min(1)
  offerID: number;
}
