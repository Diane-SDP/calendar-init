import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsEnum(['Employee', 'Admin', 'ProjectManager'])
  role?: 'Employee' | 'Admin' | 'ProjectManager';
}
