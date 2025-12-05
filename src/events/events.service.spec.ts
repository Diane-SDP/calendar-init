import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { EventType } from '../common/enums/event-type.enum';
import { EventStatus } from '../common/enums/event-status.enum';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { ProjectUser } from '../project-users/entities/project-user.entity';

jest.mock('dayjs', () => {
  const actual = jest.requireActual('dayjs');
  return (...args: any[]) => actual(...args);
});

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepo: jest.Mocked<Repository<Event>>;
  let projectUsersRepo: jest.Mocked<Repository<ProjectUser>>;

  const user: User = { id: 'u1', role: Role.Employee } as User;
  const admin: User = { id: 'admin', role: Role.Admin } as User;

  beforeEach(() => {
    eventsRepo = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<Event>>;

    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    projectUsersRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as jest.Mocked<Repository<ProjectUser>>;

    service = new EventsService(eventsRepo, projectUsersRepo);
  });

  it('creates remote work accepted by default', async () => {
    eventsRepo.findOne.mockResolvedValue(null);
    eventsRepo.count.mockResolvedValue(0);
    eventsRepo.create.mockReturnValue({
      id: 'e1',
      eventType: EventType.RemoteWork,
      eventStatus: EventStatus.Accepted,
    } as Event);
    eventsRepo.save.mockResolvedValue({
      id: 'e1',
      eventType: EventType.RemoteWork,
      eventStatus: EventStatus.Accepted,
    } as Event);

    const event = await service.create(
      {
        date: new Date(),
        eventType: EventType.RemoteWork,
      } as any,
      user,
    );

    expect(event.eventStatus).toBe(EventStatus.Accepted);
    expect(eventsRepo.save).toHaveBeenCalled();
  });

  it('rejects duplicate same date', async () => {
    eventsRepo.findOne.mockResolvedValue({ id: 'existing' } as Event);

    await expect(
      service.create(
        {
          date: new Date(),
          eventType: EventType.RemoteWork,
        } as any,
        user,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('limits remote work to two per week', async () => {
    eventsRepo.findOne.mockResolvedValue(null);
    eventsRepo.count.mockResolvedValue(2);

    await expect(
      service.create(
        {
          date: new Date(),
          eventType: EventType.RemoteWork,
        } as any,
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validation denied without role', async () => {
    await expect(
      service.validateEvent('id', user),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('admin validates pending paid leave', async () => {
    const paidLeave: Event = {
      id: 'e1',
      date: new Date(),
      eventType: EventType.PaidLeave,
      eventStatus: EventStatus.Pending,
      userId: 'u2',
    } as Event;

    const qb = projectUsersRepo.createQueryBuilder('');
    (qb.getOne as jest.Mock).mockResolvedValue({
      project: { referringEmployeeId: admin.id },
    } as any);

    eventsRepo.findOne.mockResolvedValue(paidLeave);
    eventsRepo.save.mockImplementation(async (ev) => ev as Event);

    const updated = await service.validateEvent('e1', admin);
    expect(updated.eventStatus).toBe(EventStatus.Accepted);
  });

  it('NotFound when event missing', async () => {
    eventsRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

