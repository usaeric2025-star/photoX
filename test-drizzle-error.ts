import { DrizzleError } from 'drizzle-orm';
class DrizzleQueryError extends DrizzleError {
  cause?: any;
  constructor(message: string, cause?: any) {
    super({ message, cause });
    this.cause = cause;
  }
}
const e = new DrizzleQueryError('Failed query: blah', { message: 'invalid input syntax for type uuid: ""', code: '22P02' });
console.log("Message:", e.message);
console.log("Cause:", e.cause);
