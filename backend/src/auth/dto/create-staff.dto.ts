import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @MaxLength(72)
  password!: string;
}