const withTransaction = jest.fn(<T>(cb: (t: unknown) => Promise<T>) => cb({}));

export default withTransaction;
