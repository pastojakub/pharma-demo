import { IsString, IsNotEmpty, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BatchFulfillmentDto {
  @IsString()
  @IsNotEmpty()
  batchID: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class FulfillOrderDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchFulfillmentDto)
  batches: BatchFulfillmentDto[];
}
