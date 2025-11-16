import 'dotenv/config';
import dataSource from '../src/config/database.config';

async function main() {
  await dataSource.initialize();
  try {
    const rows = await dataSource.query(
      'SELECT id, name, domain, "allowedEmailDomains", "allowSelfRegistration" FROM institutions ORDER BY name'
    );

    if (!rows.length) {
      console.log('No se encontraron instituciones registradas.');
      return;
    }

    console.table(rows);
  } catch (error) {
    console.error('Error consultando instituciones:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

main();
