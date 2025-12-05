import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { ProjectUser } from '../project-users/entities/project-user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectUser)
    private readonly projectUsersRepository: Repository<ProjectUser>,
    private readonly usersService: UsersService,
  ) {}

  async create(createProjectDto: CreateProjectDto, currentUser: User) {
    const referringEmployee = await this.usersService.findOne(
      createProjectDto.referringEmployeeId,
    );

    if (
      referringEmployee.role !== Role.Admin &&
      referringEmployee.role !== Role.ProjectManager
    ) {
      throw new UnauthorizedException(
        'Referring employee must be at least a project manager',
      );
    }

    const existingProject = await this.projectsRepository.findOne({
      where: { name: createProjectDto.name },
    });

    if (existingProject) {
      throw new ConflictException('A project with this name already exists');
    }

    const project = this.projectsRepository.create({
      ...createProjectDto,
      referringEmployee,
    });

    return this.projectsRepository.save(project);
  }

  async findAllForUser(user: User) {
    if (user.role === Role.Admin || user.role === Role.ProjectManager) {
      return this.projectsRepository.find({
        where: { archived: false },
        order: { createdAt: 'DESC' },
      });
    }

    const assignments = await this.projectUsersRepository.find({
      where: { userId: user.id },
      relations: ['project'],
    });

    const uniqueProjects = new Map<string, Project>();
    assignments.forEach((assignment) => {
      if (assignment.project && !assignment.project.archived) {
        uniqueProjects.set(assignment.project.id, assignment.project);
      }
    });

    return Array.from(uniqueProjects.values());
  }

  async findOneForUser(projectId: string, user: User) {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (!project || project.archived) {
      throw new NotFoundException('Project not found');
    }

    if (user.role === Role.Admin || user.role === Role.ProjectManager) {
      return project;
    }

    const assignment = await this.projectUsersRepository.findOne({
      where: { projectId, userId: user.id },
    });

    if (!assignment) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async update(
    projectId: string,
    updateProjectDto: UpdateProjectDto,
    currentUser: User,
  ) {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (!project || project.archived) {
      throw new NotFoundException('Project not found');
    }

    if (currentUser.role === Role.ProjectManager) {
      if (project.referringEmployeeId !== currentUser.id) {
        throw new ForbiddenException(
          'Project managers can only update their own projects',
        );
      }
    }

    if (updateProjectDto.name) {
      const existingProject = await this.projectsRepository.findOne({
        where: { name: updateProjectDto.name },
      });

      if (existingProject && existingProject.id !== projectId) {
        throw new ConflictException('A project with this name already exists');
      }
    }

    if (updateProjectDto.referringEmployeeId) {
      const referringEmployee = await this.usersService.findOne(
        updateProjectDto.referringEmployeeId,
      );

      if (
        referringEmployee.role !== Role.Admin &&
        referringEmployee.role !== Role.ProjectManager
      ) {
        throw new UnauthorizedException(
          'Referring employee must be at least a project manager',
        );
      }

      project.referringEmployee = referringEmployee;
      project.referringEmployeeId = referringEmployee.id;
    }

    if (updateProjectDto.name) {
      project.name = updateProjectDto.name;
    }

    if (updateProjectDto.description !== undefined) {
      project.description = updateProjectDto.description;
    }

    return this.projectsRepository.save(project);
  }

  async archive(projectId: string) {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.archived = true;
    return this.projectsRepository.save(project);
  }
}
