import { errorFactory } from './api/_lib/error/factory.ts';

const cause = {
  code: '23503',
  detail: 'Key (group_id)=(011ed995-ed66-4e30-8b35-0f0dc5bc31cf) is not present in table "groups".',
  message: 'insert or update on table "furniture_items" violates foreign key constraint "fk_photo_group"'
};

const err = new Error('Failed query: insert into ...');
(err as any).cause = cause;

const wrapped = errorFactory.wrap(err, 'api./api/photos/upsert', 'DB_ERROR');
console.log(wrapped.message);
console.log(wrapped.context);
