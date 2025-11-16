require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'acalud_db',
  });

  try {
    await client.connect();
    const result = await client.query(
      'SELECT id, name, domain, "allowedEmailDomains", "allowSelfRegistration" FROM institutions ORDER BY name'
    );

    if (result.rows.length === 0) {
      console.log('No se encontraron instituciones registradas.');
    } else {
      console.table(result.rows);
    }
  } catch (error) {
    console.error('Error consultando instituciones:', error.message);
  } finally {
    await client.end();
  }
}

main();
