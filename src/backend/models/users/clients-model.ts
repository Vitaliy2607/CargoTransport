import pool from "../../db/db";

type Client = {
    clientId: number;
    firstName: string;
    lastName: string;
    patronymic: string;
    email: string;
    password: string; // хешированный
    address: string;
    phone: string;
    createdAt: Date;
}

export class ClientModel {
    static async findByEmail(email: string): Promise<Client | null> {
        const result = await pool.query(
            'SELECT * FROM "Clients" WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    static async create(data: Omit<Client, 'clientId' | 'createdAt'>): Promise<Client> {
        const { firstName, lastName, patronymic, email, password, address, phone } = data;
        const result = await pool.query(
            `INSERT INTO "Clients" ("firstName", "lastName", patronymic, email, password, address, phone, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
            [firstName, lastName, patronymic, email, password, address, phone]
        );
        return result.rows[0];
    }
}

export default ClientModel;