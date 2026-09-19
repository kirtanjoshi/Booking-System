import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { CreateClientDto, UpdateClientDto } from './dto/create-client.dto';

@Controller('clients')
@UseGuards(AdminAuthGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  async getAll() {
    return this.clientService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.clientService.getById(id);
  }

  @Post()
  async create(@Body() dto: CreateClientDto) {
    return this.clientService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.clientService.delete(id);
  }
}
