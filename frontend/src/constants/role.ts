export const Roles = {
    SuperAdmin: 'SuperAdmin',
    Admin: 'Admin',
    Staff: 'Staff',
    Guest: 'Guest'
} as const

export const RoleValues = [
    Roles.SuperAdmin,
    Roles.Admin,
    Roles.Staff,
    Roles.Guest
] as const

export type RoleType = (typeof Roles)[keyof typeof Roles]