import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectUsersService } from './project-users.service';
import { CreateProjectUserDto } from './dto/create-project-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Project Users')
@ApiBearerAuth('access-token')
@Controller('project-users')
export class ProjectUsersController {
  constructor(private readonly projectUsersService: ProjectUsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List the project assignments visible to the current user.',
  })
  @ApiResponse({ status: 200, description: 'Assignments retrieved.' })
  async findAll(@CurrentUser() user: User) {
    return this.projectUsersService.findAllForUser(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retrieve a project assignment by id.' })
  @ApiResponse({ status: 200, description: 'Assignment found.' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.projectUsersService.findOneForUser(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.ProjectManager)
  @ApiOperation({ summary: 'Assign a user to a project.' })
  @ApiResponse({ status: 201, description: 'Assignment created.' })
  async create(
    @Body() createProjectUserDto: CreateProjectUserDto,
    @CurrentUser() user: User,
  ) {
    return this.projectUsersService.create(createProjectUserDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.ProjectManager)
  @ApiOperation({ summary: 'Remove an assignment of a user from a project.' })
  @ApiResponse({ status: 200, description: 'Assignment deleted.' })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.projectUsersService.remove(id, user);
  }
}

