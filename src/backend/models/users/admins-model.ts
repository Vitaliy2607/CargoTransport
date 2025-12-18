import pool from '../../db/db';

export type Admin = {
    logisticianId: number;
    firstName: string;
    lastName: string;
    patronymic: string;
    email: string;
    password: string;
    phone: string;
    createdAt: Date;
}

class AdminModel {
    static async findByEmail(email: string): Promise<Admin | null> {
        const result = await pool.query(
            'SELECT * FROM "Admins" WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    static async create(data: Omit<Admin, 'logisticianId' | 'createdAt'>): Promise<Admin> {
        const { firstName, lastName, patronymic, email, password, phone } = data;
        const result = await pool.query(
            `INSERT INTO "Admins" ("firstName", "lastName", patronymic, email, password, phone, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
            [firstName, lastName, patronymic, email, password, phone]
        );
        return result.rows[0];
    }
}

export default AdminModel;