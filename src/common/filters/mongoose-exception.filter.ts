import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import mongoose from 'mongoose';

@Catch()
export class MongooseExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Duplicate key
    if (exception?.code === 11000) {
      const field = Object.keys(exception.keyPattern ?? {})[0];
      const value = exception.keyValue?.[field];

      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'Duplicate value',
        errors: [
          {
            field,
            message: `${field} '${value}' already exists`,
          },
        ],
      });
    }

    // Mongoose validation
    if (exception instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(exception.errors).map((error) => ({
        field: error.path,
        message:
          error instanceof mongoose.Error.ValidatorError &&
          error.kind === 'required'
            ? `${error.path} is required`
            : error.message,
      }));

      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        errors,
      });
    }

    // Mongoose CastError
    if (exception instanceof mongoose.Error.CastError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid value',
        errors: [
          {
            field: exception.path,
            message: `Invalid value for ${exception.path}`,
          },
        ],
      });
    }

    // باقي الأخطاء
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}