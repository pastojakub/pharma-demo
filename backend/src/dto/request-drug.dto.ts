import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class RequestDrugDto {
  @IsString()
  @IsNotEmpty()
  requestID: string;

  @IsString()
  @IsNotEmpty()
  drugID: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  manufacturerOrg: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;
}
