import { BaseListDto } from '@interfaces/base.dto';
import type { ConsultationType } from '@models/consultation.model';

export interface PatientIdParamsDto {
  patientId: string;
}

export interface CreateConsultationDto {
  consultDate: string;
  price?: number;
  type: ConsultationType;
  weight?: number | null;
  bodyFat?: number | null;
  muscle?: number | null;
  water?: number | null;
  arm?: number | null;
  waist?: number | null;
  abdomen?: number | null;
  hip?: number | null;
  height?: number | null;
  age?: number | null;
  objetivoKcal?: number | null;
  notes?: string | null;
  nutriologaId?: string | null;
}

export interface UpdateConsultationDto {
  consultDate?: string;
  price?: number;
  type?: ConsultationType;
  weight?: number | null;
  bodyFat?: number | null;
  muscle?: number | null;
  water?: number | null;
  arm?: number | null;
  waist?: number | null;
  abdomen?: number | null;
  hip?: number | null;
  height?: number | null;
  age?: number | null;
  objetivoKcal?: number | null;
  notes?: string | null;
  nutriologaId?: string | null;
}

export interface ConsultationDto {
  id: string;
  patientId: string;
  nutriologaId: string | null;
  consultDate: string;
  price: number;
  type: ConsultationType;
  weight: number | null;
  bodyFat: number | null;
  muscle: number | null;
  water: number | null;
  arm: number | null;
  waist: number | null;
  abdomen: number | null;
  hip: number | null;
  height: number | null;
  age: number | null;
  objetivoKcal: number | null;
  notes: string | null;
  createdAt?: string;
}

export type ConsultationListDto = BaseListDto<ConsultationDto>;
