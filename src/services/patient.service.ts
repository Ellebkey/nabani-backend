import { Op, Includeable } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { NotFoundError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { PatientInstance } from '@models/patient.model';
import type { PatientStatus } from '@models/patient.model';
import { PatientAddressInstance } from '@models/patient-address.model';
import { NutritionPlanInstance } from '@models/nutrition-plan.model';
import { WhereClause } from '@interfaces/base.dto';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientDto,
  PatientListItemDto,
  PatientAddressDto,
  NutritionPlanDto,
  PatientAddressInputDto,
  NutritionPlanInputDto,
  PatientFilterDto,
  PatientListDto,
} from '@interfaces/patient.dto';

class PatientService {
  private calorieLevelInclude = (): Includeable => ({
    model: db.CalorieLevel,
    as: 'calorieLevel',
    attributes: ['id', 'kcal', 'label'],
  });

  private detailIncludes = (): Includeable[] => ([
    this.calorieLevelInclude(),
    { model: db.User, as: 'nutriologa', attributes: ['id', 'fullname', 'username'] },
    { model: db.PatientAddress, as: 'address' },
    { model: db.NutritionPlan, as: 'nutritionPlan' },
    {
      model: db.Disease, as: 'diseases', through: { attributes: [] }, attributes: ['id', 'key', 'name'],
    },
    {
      model: db.Ingredient, as: 'preferences', through: { attributes: [] }, attributes: ['id', 'name'],
    },
  ]);

  findAll = async (filters: PatientFilterDto = {}): Promise<PatientListDto> => {
    const {
      searchText, status, offset = 0, limit = 50,
    } = filters;
    const where: WhereClause = {};

    if (status) where.status = status;
    if (searchText) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${searchText}%` } },
        { lastName: { [Op.iLike]: `%${searchText}%` } },
        { email: { [Op.iLike]: `%${searchText}%` } },
        { cellphone: { [Op.iLike]: `%${searchText}%` } },
      ];
    }
    // `por_vencer` depends on packages/deliveries (Group D), not yet available;
    // the flag is accepted and left as a pass-through until that data exists.

    const { count, rows } = await db.Patient.findAndCountAll({
      where,
      include: [this.calorieLevelInclude()],
      limit,
      offset,
      order: [['firstName', 'ASC'], ['lastName', 'ASC']],
      distinct: true,
    });

    return { rows: rows.map((p) => this.toListDto(p)), count: +count };
  };

  findById = async (id: string): Promise<PatientDto> => {
    const patient = await db.Patient.findByPk(id, { include: this.detailIncludes() });
    if (!patient) throw new NotFoundError('Patient', id);
    return this.toDto(patient);
  };

  create = async (dto: CreatePatientDto, currentUserId: string): Promise<PatientDto> =>
    withTransaction(async (transaction) => {
      const patient = await db.Patient.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email ?? null,
        cellphone: dto.cellphone ?? null,
        gender: dto.gender ?? null,
        birthday: dto.birthday ?? null,
        week: dto.week ?? null,
        zone: dto.zone ?? null,
        tuppers: dto.tuppers ?? false,
        otherFood: dto.otherFood ?? null,
        otherDiseases: dto.otherDiseases ?? null,
        otherPreferences: dto.otherPreferences ?? null,
        calorieLevelId: dto.calorieLevelId ?? null,
        nutriologaId: dto.nutriologaId ?? currentUserId,
      }, { transaction });

      await this.saveAddress(patient.id, dto.address, transaction);
      await this.saveNutritionPlan(patient.id, dto.nutritionPlan, transaction);
      await this.setDiseases(patient.id, dto.diseaseIds ?? [], transaction);
      await this.setPreferences(patient.id, dto.preferenceIngredientIds ?? [], transaction);

      logger.info('Patient created', { patientId: patient.id });
      return this.findByIdTx(patient.id, transaction);
    });

  update = async (id: string, dto: UpdatePatientDto): Promise<PatientDto> =>
    withTransaction(async (transaction) => {
      const patient = await db.Patient.findByPk(id, { transaction });
      if (!patient) throw new NotFoundError('Patient', id);

      const {
        address, nutritionPlan, diseaseIds, preferenceIngredientIds, ...fields
      } = dto;
      await patient.update(fields, { transaction });

      if (address !== undefined) await this.saveAddress(id, address, transaction);
      if (nutritionPlan !== undefined) await this.saveNutritionPlan(id, nutritionPlan, transaction);
      if (diseaseIds) await this.setDiseases(id, diseaseIds, transaction);
      if (preferenceIngredientIds) await this.setPreferences(id, preferenceIngredientIds, transaction);

      logger.info('Patient updated', { patientId: id });
      return this.findByIdTx(id, transaction);
    });

  updateStatus = async (id: string, status: PatientStatus): Promise<PatientDto> =>
    withTransaction(async (transaction) => {
      const patient = await db.Patient.findByPk(id, { transaction });
      if (!patient) throw new NotFoundError('Patient', id);
      await patient.update({ status }, { transaction });
      logger.info('Patient status updated', { patientId: id, status });
      return this.findByIdTx(id, transaction);
    });

  private saveAddress = async (
    patientId: string,
    address: PatientAddressInputDto | null | undefined,
    transaction: import('sequelize').Transaction,
  ): Promise<void> => {
    if (address === undefined) return;
    if (address === null) {
      await db.PatientAddress.destroy({ where: { patientId }, transaction });
      return;
    }
    const payload = {
      patientId,
      street: address.street ?? null,
      numberExt: address.numberExt ?? null,
      numberInt: address.numberInt ?? null,
      neighborhood: address.neighborhood ?? null,
      zipCode: address.zipCode ?? null,
      city: address.city ?? null,
      state: address.state ?? null,
    };
    const existing = await db.PatientAddress.findOne({ where: { patientId }, transaction });
    if (existing) await existing.update(payload, { transaction });
    else await db.PatientAddress.create(payload, { transaction });
  };

  private saveNutritionPlan = async (
    patientId: string,
    plan: NutritionPlanInputDto | null | undefined,
    transaction: import('sequelize').Transaction,
  ): Promise<void> => {
    if (plan === undefined) return;
    if (plan === null) {
      await db.NutritionPlan.destroy({ where: { patientId }, transaction });
      return;
    }
    const payload = {
      patientId,
      calorieLevelId: plan.calorieLevelId ?? null,
      verduras: plan.verduras ?? null,
      frutas: plan.frutas ?? null,
      cereales: plan.cereales ?? null,
      lacteos: plan.lacteos ?? null,
      pDesayuno: plan.pDesayuno ?? null,
      pComida: plan.pComida ?? null,
      pCena: plan.pCena ?? null,
      aceites: plan.aceites ?? null,
      semillas: plan.semillas ?? null,
      comments: plan.comments ?? null,
    };
    const existing = await db.NutritionPlan.findOne({ where: { patientId }, transaction });
    if (existing) await existing.update(payload, { transaction });
    else await db.NutritionPlan.create(payload, { transaction });
  };

  private setDiseases = async (
    patientId: string,
    diseaseIds: string[],
    transaction: import('sequelize').Transaction,
  ): Promise<void> => {
    await db.PatientDisease.destroy({ where: { patientId }, transaction });
    if (diseaseIds.length) {
      await db.PatientDisease.bulkCreate(
        diseaseIds.map((diseaseId) => ({ patientId, diseaseId })),
        { transaction },
      );
    }
  };

  private setPreferences = async (
    patientId: string,
    ingredientIds: string[],
    transaction: import('sequelize').Transaction,
  ): Promise<void> => {
    await db.PatientPreference.destroy({ where: { patientId }, transaction });
    if (ingredientIds.length) {
      await db.PatientPreference.bulkCreate(
        ingredientIds.map((ingredientId) => ({ patientId, ingredientId })),
        { transaction },
      );
    }
  };

  private findByIdTx = async (id: string, transaction: import('sequelize').Transaction): Promise<PatientDto> => {
    const patient = await db.Patient.findByPk(id, { include: this.detailIncludes(), transaction });
    if (!patient) throw new NotFoundError('Patient', id);
    return this.toDto(patient);
  };

  private toListDto = (p: PatientInstance): PatientListItemDto => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email ?? null,
    cellphone: p.cellphone ?? null,
    gender: p.gender ?? null,
    birthday: p.birthday ?? null,
    week: p.week ?? null,
    zone: p.zone ?? null,
    tuppers: p.tuppers,
    status: p.status,
    calorieLevelId: p.calorieLevelId ?? null,
    nutriologaId: p.nutriologaId ?? null,
    calorieLevel: p.calorieLevel
      ? { id: p.calorieLevel.id, kcal: p.calorieLevel.kcal, label: p.calorieLevel.label }
      : null,
    packageSummary: null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  });

  private toDto = (p: PatientInstance): PatientDto => ({
    ...this.toListDto(p),
    otherFood: p.otherFood ?? null,
    otherDiseases: p.otherDiseases ?? null,
    otherPreferences: p.otherPreferences ?? null,
    nutriologa: p.nutriologa
      ? { id: p.nutriologa.id, fullname: p.nutriologa.fullname ?? null, username: p.nutriologa.username }
      : null,
    address: p.address ? this.addressToDto(p.address) : null,
    nutritionPlan: p.nutritionPlan ? this.planToDto(p.nutritionPlan) : null,
    diseases: (p.diseases ?? []).map((d) => ({ id: d.id, key: d.key, name: d.name })),
    preferences: (p.preferences ?? []).map((i) => ({ id: i.id, name: i.name })),
  });

  private addressToDto = (a: PatientAddressInstance): PatientAddressDto => ({
    street: a.street ?? null,
    numberExt: a.numberExt ?? null,
    numberInt: a.numberInt ?? null,
    neighborhood: a.neighborhood ?? null,
    zipCode: a.zipCode ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
  });

  private planToDto = (n: NutritionPlanInstance): NutritionPlanDto => ({
    calorieLevelId: n.calorieLevelId ?? null,
    verduras: n.verduras ?? null,
    frutas: n.frutas ?? null,
    cereales: n.cereales ?? null,
    lacteos: n.lacteos ?? null,
    pDesayuno: n.pDesayuno ?? null,
    pComida: n.pComida ?? null,
    pCena: n.pCena ?? null,
    aceites: n.aceites ?? null,
    semillas: n.semillas ?? null,
    comments: n.comments ?? null,
  });
}

export default new PatientService();
