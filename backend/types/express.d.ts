export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        name: string;
        email: string;
        password?: string;
        role: 'customer' | 'staff' | 'admin';
        phone?: string;
      };
    }
  }
}
