import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { ConsultationInstance } from '@models/consultation.model';
import {
  CreateConsultationDto,
  UpdateConsultationDto,
  ConsultationDto,
  ConsultationListDto,
} from '@interfaces/consultation.dto';

class ConsultationService {
  findAllForPatient = async (patientId: string): Promise<ConsultationListDto> => {
    const { count, rows } = await db.Consultation.findAndCountAll({
      where: { patientId },
      order: [['consultDate', 'DESC'], ['createdAt', 'DESC']],
    });
    return { rows: rows.map((c) => this.toDto(c)), count: +count };
  };

  findById = async (id: string): Promise<ConsultationDto> => {
    const consultation = await db.Consultation.findByPk(id);
    if (!consultation) throw new NotFoundError('Consultation', id);
    return this.toDto(consultation);
  };

  create = async (
    patientId: string,
    dto: CreateConsultationDto,
    currentUserId: string,
  ): Promise<ConsultationDto> =>
    withTransaction(async (transaction) => {
      const patient = await db.Patient.findByPk(patientId, { transaction });
      if (!patient) throw new NotFoundError('Patient', patientId);

      const consultation = await db.Consultation.create({
        patientId,
        nutriologaId: dto.nutriologaId ?? currentUserId,
        consultDate: dto.consultDate,
        price: dto.price ?? 0,
        type: dto.type,
        weight: dto.weight ?? null,
        bodyFat: dto.bodyFat ?? null,
        muscle: dto.muscle ?? null,
        water: dto.water ?? null,
        arm: dto.arm ?? null,
        waist: dto.waist ?? null,
        abdomen: dto.abdomen ?? null,
        hip: dto.hip ?? null,
        height: dto.height ?? null,
        age: dto.age ?? null,
        objetivoKcal: dto.objetivoKcal ?? null,
        notes: dto.notes ?? null,
      }, { transaction });

      logger.info('Consultation created', { consultationId: consultation.id, patientId });
      return this.toDto(consultation);
    });

  update = async (id: string, dto: UpdateConsultationDto): Promise<ConsultationDto> =>
    withTransaction(async (transaction) => {
      const consultation = await db.Consultation.findByPk(id, { transaction });
      if (!consultation) throw new NotFoundError('Consultation', id);
      await consultation.update(dto, { transaction });
      logger.info('Consultation updated', { consultationId: id });
      return this.toDto(consultation);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      const deleted = await db.Consultation.destroy({ where: { id }, transaction });
      if (deleted === 0) throw new NotFoundError('Consultation', id);
      logger.info('Consultation deleted', { consultationId: id });
    });

  private toDto = (c: ConsultationInstance): ConsultationDto => ({
    id: c.id,
    patientId: c.patientId,
    nutriologaId: c.nutriologaId ?? null,
    consultDate: c.consultDate,
    price: +c.price,
    type: c.type,
    weight: c.weight == null ? null : +c.weight,
    bodyFat: c.bodyFat == null ? null : +c.bodyFat,
    muscle: c.muscle == null ? null : +c.muscle,
    water: c.water == null ? null : +c.water,
    arm: c.arm == null ? null : +c.arm,
    waist: c.waist == null ? null : +c.waist,
    abdomen: c.abdomen == null ? null : +c.abdomen,
    hip: c.hip == null ? null : +c.hip,
    height: c.height == null ? null : +c.height,
    age: c.age ?? null,
    objetivoKcal: c.objetivoKcal ?? null,
    notes: c.notes ?? null,
    createdAt: c.createdAt,
  });
}

export default new ConsultationService();
