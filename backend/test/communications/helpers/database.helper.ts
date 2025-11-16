import { DataSource } from 'typeorm';

export async function resetDatabase(dataSource: DataSource): Promise<void> {
  const entities = dataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    const tableName = entity.tableName;

    if (!tableName || tableName === 'typeorm_metadata') {
      continue;
    }

    try {
      await repository.query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
    } catch (error) {
      await repository.query(`DELETE FROM "${tableName}";`);
    }
  }
}
