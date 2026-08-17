import { IsString } from 'class-validator';

export class AssetStatusDto {
  @IsString()
  status!: string;
}
