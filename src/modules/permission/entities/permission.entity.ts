import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { RolePermission } from './role-permission.entity';

@Entity('permissions')
export class Permission {
    @PrimaryColumn({ type: 'smallint' })
    id: number;

    @Column({ length: 100, unique: true })
    code: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @OneToMany(() => RolePermission, rp => rp.permission)
    rolePermissions: RolePermission[];
}
