import { Role } from '@aww/database';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      branchId: string;
      role: Role;
      branchName: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    organizationId: string;
    branchId: string;
    role: Role;
    branchName: string;
  }
}
