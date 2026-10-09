import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsIn(['WORKSHOP', 'CONFERENCE'])
  type!: 'WORKSHOP' | 'CONFERENCE';

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}