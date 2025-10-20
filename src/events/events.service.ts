import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    if (!createEventDto || !createEventDto.date || !createEventDto.eventType || !createEventDto.userId) {
      throw new BadRequestException('Missing required fields: date, eventType and userId are required');
    }

    const user = await this.usersRepository.findOne({ where: { id: createEventDto.userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${createEventDto.userId} not found`);
    }

    const event = this.eventsRepository.create({
      date: new Date(createEventDto.date),
      eventStatus: createEventDto.eventStatus ?? 'Pending',
      eventType: createEventDto.eventType,
      eventDescription: createEventDto.eventDescription,
      userId: createEventDto.userId,
    });

    return this.eventsRepository.save(event);
  }

  findAll(): Promise<Event[]> {
    return this.eventsRepository.find();
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (updateEventDto.userId) {
      const user = await this.usersRepository.findOne({ where: { id: updateEventDto.userId } });
      if (!user) {
        throw new NotFoundException(`User with ID ${updateEventDto.userId} not found`);
      }
    }

    if (updateEventDto.date) {
      (updateEventDto as any).date = new Date(updateEventDto.date as any);
    }

    Object.assign(event, updateEventDto);
    return this.eventsRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.eventsRepository.remove(event);
  }
}
