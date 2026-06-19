import { IsArray, ArrayMinSize, IsNotEmpty, IsString } from 'class-validator';

export class ImportPreviewDto {
  @IsString()
  @IsNotEmpty()
  csv: string;
}

export interface ImportRow {
  line: number;
  valid: boolean;
  errors: string[];
  title?: string;
  category?: string;
  city?: string;
  venueName?: string;
  country?: string;
  refundPolicy?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  price?: number;
  currency?: string;
}

export class ImportConfirmDto {
  @IsArray()
  @ArrayMinSize(1)
  rows: ImportRow[];
}
