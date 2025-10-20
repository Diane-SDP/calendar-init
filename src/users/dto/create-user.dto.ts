import { IsEmail, IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsEnum(['Employee', 'Admin', 'ProjectManager'])
  role?: 'Employee' | 'Admin' | 'ProjectManager';
}
