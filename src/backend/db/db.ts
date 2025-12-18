import { Pool } from 'pg';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'CargoTransport',
    user: 'postgres',
    password: '12345',
});

pool.on('error', (err) => {
    console.error('Connection to db failed', err);
    process.exit(-1);
});

export default pool;