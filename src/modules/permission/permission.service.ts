import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Role } from '../auth/entities/role.entity';
import { CreatePermissionDto, UpdatePermissionDto, CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dto/permission.dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  // Permission CRUD
  async createPermission(dto: CreatePermissionDto) {
    const existing = await this.permissionRepository.findOne({ where: [{ id: dto.id }, { code: dto.code }] });
    if (existing) {
      throw new ConflictException('Permission ID or Code already exists');
    }
    const permission = this.permissionRepository.create(dto);
    return this.permissionRepository.save(permission);
  }

  async findAllPermissions() {
    return this.permissionRepository.find();
  }

  async findPermissionById(id: number) {
    const permission = await this.permissionRepository.findOne({ where: { id } });
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async updatePermission(id: number, dto: UpdatePermissionDto) {
    const permission = await this.findPermissionById(id);
    Object.assign(permission, dto);
    return this.permissionRepository.save(permission);
  }

  async removePermission(id: number) {
    const permission = await this.findPermissionById(id);
    await this.permissionRepository.remove(permission);
    return { message: 'Permission removed' };
  }

  // Role CRUD
  async createRole(dto: CreateRoleDto) {
    const existing = await this.roleRepository.findOne({ where: [{ id: dto.id }, { code: dto.code }] });
    if (existing) {
      throw new ConflictException('Role ID or Code already exists');
    }
    const role = this.roleRepository.create(dto);
    return this.roleRepository.save(role);
  }

  async findAllRoles() {
    return this.roleRepository.find({ relations: ['rolePermissions', 'rolePermissions.permission'] });
  }

  async findRoleById(id: number) {
    const role = await this.roleRepository.findOne({ 
      where: { id },
      relations: ['rolePermissions', 'rolePermissions.permission'] 
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async updateRole(id: number, dto: UpdateRoleDto) {
    const role = await this.findRoleById(id);
    Object.assign(role, dto);
    return this.roleRepository.save(role);
  }

  async removeRole(id: number) {
    const role = await this.findRoleById(id);
    await this.roleRepository.remove(role);
    return { message: 'Role removed' };
  }

  // Role-Permission assignment
  async assignPermissionToRole(dto: AssignPermissionDto) {
    const { role_id, permission_id } = dto;
    
    // Verify role and permission exist
    await this.findRoleById(role_id);
    await this.findPermissionById(permission_id);

    const existing = await this.rolePermissionRepository.findOne({
      where: { role_id, permission_id }
    });
    if (existing) throw new ConflictException('Permission already assigned to role');

    const rolePermission = this.rolePermissionRepository.create({
      role_id,
      permission_id
    });
    return this.rolePermissionRepository.save(rolePermission);
  }

  async revokePermissionFromRole(roleId: number, permissionId: number) {
    const result = await this.rolePermissionRepository.delete({
      role_id: roleId,
      permission_id: permissionId
    });
    if (result.affected === 0) throw new NotFoundException('Assignment not found');
    return { message: 'Permission revoked from role' };
  }
}
