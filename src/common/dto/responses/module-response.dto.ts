import { ApiProperty } from '@nestjs/swagger';

export class ModuleDto {
  @ApiProperty({ 
    description: 'Module ID', 
    example: 1, 
    type: Number 
  })
  id: number;

  @ApiProperty({ 
    description: 'Module name', 
    example: 'Dashboard', 
    type: String 
  })
  name: string;

  @ApiProperty({ 
    description: 'Whether the module is enabled for the role', 
    example: true, 
    type: Boolean,
    required: false,
  })
  is_enable?: boolean;

  @ApiProperty({ 
    description: 'Child modules (nested structure)', 
    type: [ModuleDto], 
    required: false,
    example: [
      {
        id: 2,
        name: 'Sub Module',
        is_enable: true
      }
    ]
  })
  children?: ModuleDto[];
}

export class ModulesResponseDto {
  @ApiProperty({
    description: 'List of root modules with their hierarchy',
    type: [ModuleDto],
    example: [
      {
        id: 1,
        name: 'Dashboard',
        children: [
          {
            id: 2,
            name: 'Sub Module'
          }
        ]
      }
    ]
  })
  modules: ModuleDto[];
}

export class SidebarModulesResponseDto {
  @ApiProperty({
    description: 'List of modules for sidebar navigation based on role permissions',
    type: [ModuleDto],
    example: [
      {
        id: 1,
        name: 'Dashboard',
        is_enable: true,
        children: [
          {
            id: 2,
            name: 'Sub Module',
            is_enable: true
          }
        ]
      }
    ]
  })
  sidebar: ModuleDto[];
}

