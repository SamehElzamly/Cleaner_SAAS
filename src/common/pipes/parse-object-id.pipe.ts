import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// Without this, a malformed id in the URL (e.g. /branches/abc) reaches
// Mongoose, which throws a CastError that surfaces as a 500. This turns it
// into a clean 400 before any query runs.
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[a-f\d]{24}$/i.test(value)) {
      throw new BadRequestException(`"${value}" is not a valid id`);
    }
    return value;
  }
}
