import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({
    example: 'Jane Doe',
    minLength: 3,
    description: 'Display name visible across the workspace.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username!: string;

  @ApiProperty({
    example: 'jane.doe@example.com',
    description: 'Unique email address used to contact the user.',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'Sup3rStr0ng!',
    minLength: 8,
    description: 'Password that meets the minimum security policy.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.Employee,
    description: 'Optional role override (defaults to Employee).',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
