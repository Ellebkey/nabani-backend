import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { DiseaseInstance } from '@models/disease.model';
import { CreateDiseaseDto, UpdateDiseaseDto, DiseaseDto, DiseaseListDto } from '@interfaces/disease.dto';

class DiseaseService {
  findAll = async (): Promise<DiseaseListDto> => {
    const { count, rows } = await db.Disease.findAndCountAll({ order: [['name', 'ASC']] });
    return { rows: rows.map((d) => this.toDto(d)), count: +count };
  };

  findById = async (id: string): Promise<DiseaseDto> => {
    const disease = await db.Disease.findByPk(id);
    if (!disease) throw new NotFoundError('Disease', id);
    return this.toDto(disease);
  };

  create = async (dto: CreateDiseaseDto): Promise<DiseaseDto> =>
    withTransaction(async (transaction) => {
      const disease = await db.Disease.create({ key: dto.key, name: dto.name }, { transaction });
      logger.info('Disease created', { diseaseId: disease.id });
      return this.toDto(disease);
    });

  update = async (id: string, dto: UpdateDiseaseDto): Promise<DiseaseDto> =>
    withTransaction(async (transaction) => {
      const disease = await db.Disease.findByPk(id, { transaction });
      if (!disease) throw new NotFoundError('Disease', id);
      await disease.update(dto, { transaction });
      return this.toDto(disease);
    });

  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      const deleted = await db.Disease.destroy({ where: { id }, transaction });
      if (deleted === 0) throw new NotFoundError('Disease', id);
    });

  private toDto = (d: DiseaseInstance): DiseaseDto => ({ id: d.id, key: d.key, name: d.name });
}

export default new DiseaseService();
