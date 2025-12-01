import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'employee@example.com',
    description: 'Unique email address used to authenticate the user.',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'Sup3rStr0ng!',
    minLength: 8,
    description: 'User password. Minimum length of 8 characters.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}

