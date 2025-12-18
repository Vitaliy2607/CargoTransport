import pool from '../../db/db';

export type Logistician = {
    logisticianId: number;
    firstName: string;
    lastName: string;
    patronymic: string;
    email: string;
    password: string;
    phone: string;
    createdAt: Date;
}

class LogisticianModel {
    static async findByEmail(email: string): Promise<Logistician | null> {
        const result = await pool.query(
            'SELECT * FROM "Logisticians" WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    static async create(data: Omit<Logistician, 'logisticianId' | 'createdAt'>): Promise<Logistician> {
        const { firstName, lastName, patronymic, email, password, phone } = data;
        const result = await pool.query(
            `INSERT INTO "Logisticians" ("firstName", "lastName", patronymic, email, password, phone, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
            [firstName, lastName, patronymic, email, password, phone]
        );
        return result.rows[0];
    }
}

export default LogisticianModel;