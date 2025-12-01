import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  UseGuards,
  ForbiddenException,
  Patch,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';
import { LoginDto } from '../auth/dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { Role } from '../common/enums/role.enum';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @Post('auth/sign-up')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user account.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User created.' })
  async signUp(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return user;
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and retrieve a JWT token.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Credentials are valid. Returns the JWT payload.',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List every user (admin only).' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Users retrieved.' })
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retrieve the authenticated profile.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile returned.',
  })
  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a user by id.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User found.' })
  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Calculate the number of meal vouchers for a user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Meal voucher amount returned.',
  })
  @Get(':id/meal-vouchers/:month')
  async getMealVouchers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('month', new ParseIntPipe()) month: number,
    @CurrentUser() user: User,
  ) {
    if (user.role === Role.Employee && user.id !== id) {
      throw new ForbiddenException('You can only access your own vouchers');
    }

    return this.usersService.calculateMealVouchers(id, month);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update the specified user.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User updated.' })
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: User,
  ) {
    if (user.role === Role.Employee && user.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersService.update(id, updateUserDto);
  }
}
