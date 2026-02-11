import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { RolePermission } from '../../permission/entities/role-permission.entity';

@Entity('roles')
export class Role {
    @PrimaryColumn({ type: 'smallint' })
    id: number;

    @Column({ length: 50, unique: true })
    code: string;

    @Column({ length: 100 })
    name: string;

    @OneToMany(() => User, user => user.role)
    users: User[];

    @OneToMany(() => RolePermission, rp => rp.role)
    rolePermissions: RolePermission[];
}
