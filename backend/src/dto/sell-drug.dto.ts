import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class SellDrugDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;
}
