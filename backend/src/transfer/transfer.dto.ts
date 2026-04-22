import { IsString, IsNotEmpty, IsIn, IsNumber } from 'class-validator';

export class TransferDto {
  @IsString()
  @IsNotEmpty()
  batchID: string;

  @IsString()
  @IsNotEmpty()
  newOwnerOrg: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['IN_TRANSIT', 'DELIVERED'])
  status: string;
}
