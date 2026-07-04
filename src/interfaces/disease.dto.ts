import { BaseListDto } from '@interfaces/base.dto';

export interface CreateDiseaseDto {
  key: string;
  name: string;
}

export interface UpdateDiseaseDto {
  key?: string;
  name?: string;
}

export interface DiseaseDto {
  id: string;
  key: string;
  name: string;
}

export type DiseaseListDto = BaseListDto<DiseaseDto>;
