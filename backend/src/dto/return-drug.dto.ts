import { IsString, IsNotEmpty } from 'class-validator';

export class ReturnDrugDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  manufacturerOrg: string;
}
