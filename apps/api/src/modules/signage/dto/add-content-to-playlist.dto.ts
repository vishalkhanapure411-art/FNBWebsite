import { IsString } from 'class-validator';

export class AddContentToPlaylistDto {
  @IsString()
  contentId: string;
}
