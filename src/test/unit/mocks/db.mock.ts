export const db = {
  Article: {
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    bulkCreate: jest.fn(),
  },
  ArticleRecord: {
    create: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
  },
  ExpenseItem: {
    count: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
  },
  Recipient: {
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
  },
  Tag: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
  },
  ExpenseTag: {
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
  },
  PaymentMethod: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  Account: {},
  Category: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  Subcategory: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
  Expense: {
    count: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  // Catalog services resolve the partnership context on reads; an unmocked
  // findOne resolves undefined -> no partnership -> [userId] fallback.
  PartnershipMember: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  },
  Partnership: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  PartnershipExcludedCategory: {
    findAll: jest.fn(),
  },
  sequelize: {
    fn: jest.fn((...args: unknown[]) => args),
    col: jest.fn((col: string) => col),
    literal: jest.fn((lit: string) => lit),
    where: jest.fn((...args: unknown[]) => args),
    query: jest.fn(),
  },
};
