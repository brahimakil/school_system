import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateAiSettingsDto {
  @IsString()
  apiKey: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class TestAiKeyDto {
  @IsString()
  apiKey: string;
}
