import {
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import {
    TicketCategory,
    TicketPriority,
} from '../generated/prisma/client';

export class CreateTicketDto {
    @IsString()
    @MinLength(5)
    @MaxLength(150)
    title: string;

    @IsString()
    @MinLength(10)
    @MaxLength(5000)
    description: string;

    @IsOptional()
    @IsEnum(TicketPriority)
    priority?: TicketPriority;

    @IsOptional()
    @IsEnum(TicketCategory)
    category?: TicketCategory;

    @IsOptional()
    @IsString()
    @MinLength(1)
    slaId?: string;
}
