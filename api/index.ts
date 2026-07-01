import { app } from './_app.js';

export const runtime = 'nodejs';

export function GET(request: Request) {
  return app.request(request);
}

export function POST(request: Request) {
  return app.request(request);
}

export function PUT(request: Request) {
  return app.request(request);
}

export function DELETE(request: Request) {
  return app.request(request);
}

export function PATCH(request: Request) {
  return app.request(request);
}

export function OPTIONS(request: Request) {
  return app.request(request);
}

