import { randomBytes, scryptSync } from 'node:crypto';

const password = process.env.APP_PASSWORD;
if (!password || password.length < 12) {
  console.error('Defina APP_PASSWORD com pelo menos 12 caracteres antes de executar este script.');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');
console.log(`${salt}:${hash}`);

