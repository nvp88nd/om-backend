import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { Role } from '../../auth/entities/role.entity';

@Entity('role_permissions')
export class RolePermission {
    @PrimaryColumn({ type: 'smallint' })
    role_id: number;

    @PrimaryColumn({ type: 'smallint' })
    permission_id: number;

    @ManyToOne(() => Role, role => role.rolePermissions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @ManyToOne(() => Permission, p => p.rolePermissions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
    permission: Permission;
}
