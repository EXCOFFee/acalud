import { config } from 'dotenv';

config({ path: process.env.E2E_ENV_FILE || '.env.test' });

// Ajustar timeout global para pruebas que requieren IO real
jest.setTimeout(60000);
