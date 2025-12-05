import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums/role.enum';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const user = {
    id: 'user-1',
    email: 'john@example.com',
    username: 'john',
    password: 'hashed',
    role: Role.Employee,
    createdAt: new Date(),
    updatedAt: new Date(),
    projectAssignments: [],
    referredProjects: [],
    events: [],
  } as any;

  beforeEach(() => {
    usersService = {
      findByEmailWithPassword: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    jwtService = {
      signAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    authService = new AuthService(usersService, jwtService);
  });


  it('fails when user is missing', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);
    await expect(
      authService.login({ email: user.email, password: 'secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('fails on wrong password', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({ ...user });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      authService.login({ email: user.email, password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

