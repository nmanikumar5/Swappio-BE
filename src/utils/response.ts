import { Response } from 'express';

interface SuccessResponse {
  success: true;
  data?: any;
  message?: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: any;
}

export const sendSuccess = (
  res: Response,
  statusCode: number = 200,
  data?: any,
  message?: string
): Response => {
  const response: SuccessResponse = {
    success: true,
    ...(data && { data }),
    ...(message && { message }),
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  statusCode: number = 500,
  message: string,
  error?: any
): Response => {
  const response: ErrorResponse = {
    success: false,
    message,
    ...(error && { error }),
  };
  return res.status(statusCode).json(response);
};
