import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Modules } from 'src/Entities/entities/Modules';
import { RelationModule } from 'src/Entities/entities/RelationModule';
import { RolePermissions } from 'src/Entities/entities/RolePermissions';
import { UserRole } from 'src/Entities/entities/UserRole';
import { Users } from 'src/Entities/entities/Users';
import {
  TRUE_RECURSIVE_RELATION_QUERY,
  FALSE_RECURSIVE_RELATION_QUERY,
} from './recursive-permissions.query';

@Injectable()
export class RBACService {
  constructor(
    @InjectRepository(Modules)
    private readonly moduleRepo: Repository<Modules>,

    @InjectRepository(RelationModule)
    private readonly relationRepo: Repository<RelationModule>,

    @InjectRepository(RolePermissions)
    private readonly permissionRepo: Repository<RolePermissions>,

    @InjectRepository(UserRole)
    private readonly roleRepo: Repository<UserRole>,

    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
  ) {}

  private sortModulesById(modules: any[]): any[] {
    return modules
      .sort((a, b) => a.id - b.id)
      .map((module) => {
        const sortedChildren = module.children
          ? this.sortModulesById(module.children)
          : [];

        const { children, ...rest } = module;
        return sortedChildren.length > 0
          ? { ...rest, children: sortedChildren }
          : { ...rest };
      });
  }

  async getModules() {
    const modules = await this.moduleRepo.find();
    const relations = await this.relationRepo.find({
      relations: ['parentModule', 'childModule'],
    });

    const moduleMap = new Map<number, any>();
    for (const mod of modules) {
      moduleMap.set(mod.id, {
        id: mod.id,
        name: mod.moduleName,
        children: [],
      });
    }

    // Build hierarchy with defensive checks
    for (const rel of relations) {
      if (!rel.parentModule || !rel.childModule) continue; // Defensive check
      const parent = moduleMap.get(rel.parentModule.id);
      const child = moduleMap.get(rel.childModule.id);
      if (parent && child) {
        parent.children.push(child);
      }
    }

    // Root modules = modules that are not child of anyone
    const allChildIds = new Set(
      relations.filter((r) => r.childModule).map((r) => r.childModule.id),
    );
    const roots = [...moduleMap.values()].filter(
      (mod) => !allChildIds.has(mod.id),
    );

    return roots;
  }

  //   async assignPermissions(
  //     roleId: number,
  //     moduleId: number,
  //     isEnable: boolean,
  //     currentUser: Users,
  //   ) {
  //     let relationIdsResult: { id: number }[] = [];

  //     // Always include direct relations
  //     const baseRelations = await this.relationRepo.query(
  //       `SELECT id FROM relation_module WHERE parent_module_id = $1 OR child_module_id = $1`,
  //       [moduleId],
  //     );

  //     // Recursive get relation IDs (bottom to top + top to bottom)
  //     if (isEnable) {
  //       relationIdsResult = await this.relationRepo.query(
  //         TRUE_RECURSIVE_RELATION_QUERY,
  //         [moduleId],
  //       );
  //     } else {
  //       const recursiveResult = await this.relationRepo.query(
  //         FALSE_RECURSIVE_RELATION_QUERY,
  //         [moduleId],
  //       );
  //       relationIdsResult = [...recursiveResult, ...baseRelations];
  //     }

  //     const relationIds = Array.from(new Set(relationIdsResult.map((r) => r.id)));

  //     // Only update records (no insert logic)
  //     const result = await this.permissionRepo
  //       .createQueryBuilder()
  //       .update(RolePermissions)
  //       .set({ isEnable })
  //       .where('relation_id IN (:...ids)', { ids: relationIds })
  //       .andWhere('role_id = :roleId', { roleId })
  //       .execute();

  //     // Optional: return updated permission matrix for UI
  //     const updatedMatrix = await this.getModulesByRole(roleId);

  //     return {
  //       message: `Permissions ${isEnable ? 'enabled' : 'disabled'} for role`,
  //       moduleId,
  //       totalUpdated: relationIds.length,
  //       updatedMatrix,
  //     };
  //   }

  async getModulesByRole(roleId: number) {
    const permissions = await this.permissionRepo.find({
      where: { roleId: roleId },
      relations: [
        'relation',
        'relation.parentModule',
        'relation.childModule',
        'role',
      ],
    });

    const moduleMap = new Map<number, any>();
    const childToParentMap = new Map<number, number>();

    for (const perm of permissions) {
      const rel = perm.relation;
      const parent = rel.parentModule;
      const child = rel.childModule;

      if (!parent) continue;

      // Parent add/update
      if (!moduleMap.has(parent.id)) {
        moduleMap.set(parent.id, {
          id: parent.id,
          name: parent.moduleName,
          is_enable: perm.isEnable,
          ...(child ? { children: [] } : {}),
        });
      } else if (perm.isEnable) {
        moduleMap.get(parent.id).is_enable ||= true;
      }

      // Child add/update
      if (child) {
        if (!moduleMap.has(child.id)) {
          moduleMap.set(child.id, {
            id: child.id,
            name: child.moduleName,
            is_enable: perm.isEnable,
          });
        } else if (perm.isEnable) {
          moduleMap.get(child.id).is_enable ||= true;
        }

        childToParentMap.set(child.id, parent.id);

        //  Force parent to true if child is true
        if (perm.isEnable) {
          const parentModule = moduleMap.get(parent.id);
          if (parentModule) {
            parentModule.is_enable = true;
          }
        }
      }
    }

    // Nesting children into parents
    for (const [childId, parentId] of childToParentMap.entries()) {
      const parent = moduleMap.get(parentId);
      const child = moduleMap.get(childId);
      if (parent && child) {
        if (!parent.children) parent.children = [];
        parent.children.push(child);
      }
    }

    const allChildIds = new Set(childToParentMap.keys());
    const roots = [...moduleMap.values()].filter(
      (mod) => !allChildIds.has(mod.id),
    );

    return this.sortModulesById(roots);
  }

  //   async getAllRolesPermissionMatrix() {
  //     const roles = await this.roleRepo.find();

  //     const results: { role_id: number; role_name: string; modules: any[] }[] =
  //       [];

  //     for (const role of roles) {
  //       results.push({
  //         role_id: role.id,
  //         role_name: role.roleName,
  //         modules: await this.getModulesByRole(role.id),
  //       });
  //     }
  //     return results;
  //   }
}
