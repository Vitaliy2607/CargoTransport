import pool from "../db/db";

type Order = {
    orderId: number;
    clientId: number;
    description: string;
    status: string;
    createdAt: Date;
    price: string | null;
    // Данные клиента будут джойниться
    firstName?: string;
    lastName?: string;
    patronymic?: string;
    email?: string;
}

class OrderModel {
    static async getActiveOrders() {
        const result = await pool.query(`
      SELECT o."orderId", o."clientId", o.description, o.status, o.price, o."createdAt",
             c."firstName", c."lastName", c.patronymic, c.email
      FROM "Orders" o
      JOIN "Clients" c ON o."clientId" = c."clientId"
      WHERE o.status NOT IN ('delivered', 'cancelled')
      ORDER BY o."createdAt" DESC
    `);
        console.log(result.rows);
        return result.rows;
    }

    static async getAllOrders() {
        const result = await pool.query(`
     SELECT o."orderId", o."clientId", o.description, o.status,o.price o."createdAt",
            c."firstName", c."lastName", c.patronymic,
      FROM "Orders" o
      JOIN "Clients" c ON o."clientId" = c."clientId"
      ORDER BY o."createdAt" DESC
    `);
        return result.rows;
    }
}

export default OrderModel;