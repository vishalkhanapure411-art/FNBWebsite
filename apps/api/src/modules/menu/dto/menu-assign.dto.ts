import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class MenuAssignDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  siteIds: string[];
}
