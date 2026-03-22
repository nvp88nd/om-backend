import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { CreatePermissionDto, UpdatePermissionDto, CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dto/permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  // Roles
  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.permissionService.createRole(dto);
  }

  @Get('roles')
  findAllRoles() {
    return this.permissionService.findAllRoles();
  }

  @Get('roles/:id')
  findRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.permissionService.findRoleById(id);
  }

  @Patch('roles/:id')
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.permissionService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  removeRole(@Param('id', ParseIntPipe) id: number) {
    return this.permissionService.removeRole(id);
  }

  // Permissions
  @Post()
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.permissionService.createPermission(dto);
  }

  @Get()
  findAllPermissions() {
    return this.permissionService.findAllPermissions();
  }

  @Get(':id')
  findPermissionById(@Param('id', ParseIntPipe) id: number) {
    return this.permissionService.findPermissionById(id);
  }

  @Patch(':id')
  updatePermission(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermissionDto) {
    return this.permissionService.updatePermission(id, dto);
  }

  @Delete(':id')
  removePermission(@Param('id', ParseIntPipe) id: number) {
    return this.permissionService.removePermission(id);
  }

  // Assignments
  @Post('assignments')
  assign(@Body() dto: AssignPermissionDto) {
    return this.permissionService.assignPermissionToRole(dto);
  }

  @Delete('assignments/:roleId/:permissionId')
  revoke(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number
  ) {
    return this.permissionService.revokePermissionFromRole(roleId, permissionId);
  }
}
