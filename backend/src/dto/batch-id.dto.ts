import { IsString, IsNotEmpty } from 'class-validator';

export class BatchIdDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}
