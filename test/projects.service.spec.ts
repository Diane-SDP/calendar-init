import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProjectsService } from '../src/projects/projects.service';
import { Project } from '../src/projects/entities/project.entity';
import { UsersService } from '../src/users/users.service';
import { Role } from '../src/common/enums/role.enum';
import { User } from '../src/users/entities/user.entity';
import { ProjectUser } from '../src/project-users/entities/project-user.entity';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepo: jest.Mocked<Repository<Project>>;
  let projectUsersRepo: jest.Mocked<Repository<ProjectUser>>;
  let usersService: jest.Mocked<UsersService>;

  const admin: User = { id: 'admin', role: Role.Admin } as User;
  const manager: User = { id: 'pm-1', role: Role.ProjectManager } as User;
  const employee: User = { id: 'emp-1', role: Role.Employee } as User;

  beforeEach(() => {
    projectsRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<Project>>;

    projectUsersRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ProjectUser>>;

    usersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new ProjectsService(projectsRepo, projectUsersRepo, usersService);
  });

  it('non-admin cannot create', async () => {
    await expect(
      service.create(
        { name: 'P1', description: '', referringEmployeeId: manager.id },
        employee,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('referring employee must be PM or admin', async () => {
    usersService.findOne.mockResolvedValue(employee);

    await expect(
      service.create(
        { name: 'P1', description: '', referringEmployeeId: employee.id },
        admin,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blocks duplicate name', async () => {
    usersService.findOne.mockResolvedValue(manager);
    projectsRepo.findOne.mockResolvedValue({ id: 'existing' } as Project);

    await expect(
      service.create(
        { name: 'P1', description: '', referringEmployeeId: manager.id },
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates project when checks pass', async () => {
    usersService.findOne.mockResolvedValue(manager);
    projectsRepo.findOne.mockResolvedValue(null);
    projectsRepo.create.mockReturnValue({ name: 'P1' } as Project);
    projectsRepo.save.mockResolvedValue({ id: 'p1', name: 'P1' } as Project);

    const project = await service.create(
      { name: 'P1', description: '', referringEmployeeId: manager.id },
      admin,
    );

    expect(project).toEqual({ id: 'p1', name: 'P1' });
  });

  it('denies access if not assigned', async () => {
    projectsRepo.findOne.mockResolvedValue({ id: 'p1' } as Project);
    projectUsersRepo.findOne.mockResolvedValue(null);

    await expect(service.findOneForUser('p1', employee)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('PM cannot update another project', async () => {
    projectsRepo.findOne.mockResolvedValue({
      id: 'p1',
      referringEmployeeId: manager.id,
    } as Project);

    await expect(
      service.update('p1', { name: 'New' }, { ...manager, id: 'other' } as User),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks update if name already exists', async () => {
    projectsRepo.findOne
      .mockResolvedValueOnce({
        id: 'p1',
        referringEmployeeId: manager.id,
      } as Project)
      .mockResolvedValueOnce({ id: 'p2', name: 'New' } as Project);

    await expect(
      service.update('p1', { name: 'New' }, admin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('NotFound when updating unknown project', async () => {
    projectsRepo.findOne.mockResolvedValue(null);
    await expect(
      service.update('missing', { name: 'X' }, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

