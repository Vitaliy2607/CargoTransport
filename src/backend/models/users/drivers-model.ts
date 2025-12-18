import pool from '../../db/db';

interface Driver {
    driverId: number;
    firstName: string;
    lastName: string;
    patronymic: string;
    password: string;
    licenseNumber: string;
    phone: string;
    isWorking: boolean;
    createdAt: Date;
}

class DriverModel {
    static async findByEmail(licenseNumber: string): Promise<Driver | null> {
        const result = await pool.query(
            'SELECT * FROM "Drivers" WHERE "email" = $1',
            [licenseNumber]
        );
        return result.rows[0] || null;
    }

    static async create(data: Omit<Driver, 'driverId' | 'createdAt'>): Promise<Driver> {
        const { firstName, lastName, patronymic, licenseNumber, phone, isWorking , password} = data;
        const result = await pool.query(
            `INSERT INTO "Drivers" ("firstName", "lastName", patronymic, "licenseNumber", "phone", "isWorking", "createdAt", password)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(),$7)
       RETURNING *`,
            [firstName, lastName, patronymic, licenseNumber, phone, isWorking, password]
        );
        return result.rows[0];
    }
    static async getAll() {
        const result = await pool.query(`
        SELECT "driverId", "firstName", "lastName", patronymic, "licenseNumber", phone, "isWorking", "createdAt"
        FROM "Drivers"
        ORDER BY 3, 2
  `);
        return result.rows;
    }
}

export default DriverModel;