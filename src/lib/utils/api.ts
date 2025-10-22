import { NextResponse } from 'next/server';
import { AppError } from './errors';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

export function createErrorResponse(
  error: AppError | Error,
  statusCode?: number
): NextResponse<ApiResponse> {
  const appError = error instanceof AppError ? error : null;

  return NextResponse.json(
    {
      success: false,
      error: {
        code: appError?.code || 'INTERNAL_ERROR',
        message: error.message,
        statusCode: statusCode || appError?.statusCode || 500,
        details: appError?.details,
      },
      timestamp: new Date().toISOString(),
    },
    { status: statusCode || appError?.statusCode || 500 }
  );
}

export interface PaginatedResponse<T> extends ApiResponse {
  data?: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  statusCode: number = 200
): NextResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json(
    {
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages,
      },
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
