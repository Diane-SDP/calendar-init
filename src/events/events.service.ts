import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { User } from '../users/entities/user.entity';
import { EventStatus } from '../common/enums/event-status.enum';
import { EventType } from '../common/enums/event-type.enum';
import { Role } from '../common/enums/role.enum';
import { ProjectUser } from '../project-users/entities/project-user.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(ProjectUser)
    private readonly projectUsersRepository: Repository<ProjectUser>,
  ) {}

  private normalizeDate(rawDate: Date | string): Date {
    const parsed = dayjs(rawDate);
    if (!parsed.isValid()) {
      throw new BadRequestException('Invalid date provided');
    }
    return parsed.startOf('day').toDate();
  }

  private getWeekBoundaries(date: dayjs.Dayjs) {
    const dayOfWeek = date.day();
    const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = date.add(mondayDiff, 'day').startOf('day');
    const weekEnd = weekStart.add(6, 'day').endOf('day');
    return { weekStart, weekEnd };
  }

  private async ensureNoEventOnDate(userId: string, date: Date) {
    const existing = await this.eventsRepository.findOne({
      where: { userId, date },
    });

    if (existing) {
      throw new ConflictException(
        'An event already exists for this user on the selected date',
      );
    }
  }

  private async ensureRemoteWorkQuota(userId: string, date: dayjs.Dayjs) {
    const { weekStart, weekEnd } = this.getWeekBoundaries(date);
    const remoteEvents = await this.eventsRepository.count({
      where: {
        userId,
        eventType: EventType.RemoteWork,
        date: Between(weekStart.toDate(), weekEnd.toDate()),
      },
    });

    if (remoteEvents >= 2) {
      throw new BadRequestException(
        'Remote work quota exceeded for this week',
      );
    }
  }

  private resolveDefaultStatus(eventType: EventType, user: User) {
    if (eventType === EventType.RemoteWork) {
      return EventStatus.Accepted;
    }

    if (user.role === Role.Employee) {
      return EventStatus.Pending;
    }

    return EventStatus.Accepted;
  }

  async create(createEventDto: CreateEventDto, user: User) {
    const normalizedDate = this.normalizeDate(createEventDto.date);
    const date = dayjs(normalizedDate);

    await this.ensureNoEventOnDate(user.id, normalizedDate);

    if (createEventDto.eventType === EventType.RemoteWork) {
      await this.ensureRemoteWorkQuota(user.id, date);
    }

    const event = this.eventsRepository.create({
      ...createEventDto,
      date: normalizedDate,
      eventStatus: this.resolveDefaultStatus(createEventDto.eventType, user),
      userId: user.id,
      user,
    });

    return this.eventsRepository.save(event);
  }

  async findAll() {
    return this.eventsRepository.find({
      order: { date: 'ASC' },
    });
  }

  async findOne(id: string) {
    const event = await this.eventsRepository.findOne({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  private async getAssignmentForDate(userId: string, date: Date) {
    return this.projectUsersRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.project', 'project')
      .where('assignment.userId = :userId', { userId })
      .andWhere(':date BETWEEN assignment.startDate AND assignment.endDate', {
        date: dayjs(date).format('YYYY-MM-DD'),
      })
      .getOne();
  }

  private async updateStatus(
    id: string,
    status: EventStatus,
    approver: User,
  ) {
    const event = await this.findOne(id);

    if (event.eventType !== EventType.PaidLeave) {
      throw new BadRequestException(
        'Only paid leave events can be validated or declined',
      );
    }

    if (event.eventStatus !== EventStatus.Pending) {
      throw new BadRequestException('Event status can no longer be updated');
    }

    const assignment = await this.getAssignmentForDate(
      event.userId,
      event.date,
    );

    if (!assignment) {
      throw new BadRequestException(
        'The user is not assigned to any project on the event date',
      );
    }

    if (
      approver.role === Role.ProjectManager &&
      assignment.project.referringEmployeeId !== approver.id
    ) {
      throw new UnauthorizedException(
        'Project managers can only process events for their projects',
      );
    }

    event.eventStatus = status;
    return this.eventsRepository.save(event);
  }

  async validateEvent(id: string, approver: User) {
    if (
      approver.role !== Role.Admin &&
      approver.role !== Role.ProjectManager
    ) {
      throw new UnauthorizedException(
        'Only admins or project managers can validate events',
      );
    }

    return this.updateStatus(id, EventStatus.Accepted, approver);
  }

  async declineEvent(id: string, approver: User) {
    if (
      approver.role !== Role.Admin &&
      approver.role !== Role.ProjectManager
    ) {
      throw new UnauthorizedException(
        'Only admins or project managers can decline events',
      );
    }

    return this.updateStatus(id, EventStatus.Declined, approver);
  }

  async cancelEvent(id: string, actor: User) {
    const event = await this.findOne(id);
    const today = dayjs().startOf('day');
    const eventDate = dayjs(event.date);

    // Only owner or privileged roles can touch the event
    const isOwner = actor.id === event.userId;
    const isAdmin = actor.role === Role.Admin;
    const isProjectManager = actor.role === Role.ProjectManager;

    if (!isOwner && !isAdmin && !isProjectManager) {
      throw new UnauthorizedException(
        'You are not allowed to cancel this event',
      );
    }

    if (event.eventType === EventType.RemoteWork) {
      if (eventDate.isBefore(today)) {
        throw new BadRequestException(
          'You cannot cancel a remote work that is already in the past',
        );
      }

      // For remote work, allow owner, admin or project manager with the above date rule
      await this.eventsRepository.remove(event);
      return event;
    }

    if (event.eventType === EventType.PaidLeave) {
      // Admin can cancel any paid leave at any time
      if (isAdmin) {
        await this.eventsRepository.remove(event);
        return event;
      }

      // For project managers, ensure the paid leave belongs to one of their projects
      if (isProjectManager) {
        const assignment = await this.getAssignmentForDate(
          event.userId,
          event.date,
        );

        if (
          !assignment ||
          assignment.project.referringEmployeeId !== actor.id
        ) {
          throw new UnauthorizedException(
            'Project managers can only cancel paid leaves for their projects',
          );
        }

        await this.eventsRepository.remove(event);
        return event;
      }

      // From here, we only handle the employee cancelling their own paid leave
      if (!isOwner) {
        throw new UnauthorizedException(
          'You can only cancel your own paid leaves',
        );
      }

      if (eventDate.isBefore(today)) {
        throw new BadRequestException(
          'You cannot cancel a paid leave that is already in the past',
        );
      }

      // If the paid leave is accepted, enforce the 1‑week rule
      if (event.eventStatus === EventStatus.Accepted) {
        const diffInDays = eventDate.diff(today, 'day');
        if (diffInDays < 7) {
          throw new BadRequestException(
            'You can only cancel an accepted paid leave up to one week before. Please contact an admin or your project manager.',
          );
        }
      }

      await this.eventsRepository.remove(event);
      return event;
    }

    // Fallback for potential future event types
    throw new BadRequestException('This type of event cannot be cancelled');
  }

  async findEventsForUserInMonth(userId: string, month: number, year: number) {
    const start = dayjs().year(year).month(month - 1).startOf('month');
    const end = start.endOf('month');

    return this.eventsRepository.find({
      where: {
        userId,
        date: Between(start.toDate(), end.toDate()),
      },
    });
  }

  async findAcceptedPaidLeavesInMonth(year: number, month: number) {
    const start = dayjs().year(year).month(month - 1).startOf('month');
    const end = start.endOf('month');

    return this.eventsRepository.find({
      where: {
        eventType: EventType.PaidLeave,
        eventStatus: EventStatus.Accepted,
        date: Between(start.toDate(), end.toDate()),
      },
    });
  }
}

