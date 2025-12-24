// src/backend/models/route.model.ts

import pool from "../db/db";

interface Route {
    routeId: number;
    departurePoint: string;
    destinationPoint: string;
    startDate: string | null;
    endDate: string | null;
    distance: number | null;
    orderId: number;
    vehicleId: number | null;
    driverId: number | null;
    createdAt: string;
}

class RouteModel {
    // Получить все маршруты
    static async getAll() {
        const result = await pool.query(`
            SELECT
                r."routeId",
                r."departurePoint",
                r."destinationPoint",
                r."startDate",
                r."endDate",
                r.distance,
                r."orderId",
                r."vehicleId",
                r."driverId",
                r."createdAt",
                o.description AS "orderDescription",
                d."firstName" AS "driverFirstName",
                d."lastName" AS "driverLastName",
                v.brand AS "vehicleBrand",
                v.model AS "vehicleModel",
                v."licensePlate" AS "vehicleLicensePlate"
            FROM "Routes" r
                     LEFT JOIN "Orders" o ON r."orderId" = o."orderId"
                     LEFT JOIN "Drivers" d ON r."driverId" = d."driverId"
                     LEFT JOIN "Vehicles" v ON r."vehicleId" = v."vehicleId"
            ORDER BY r."createdAt" DESC
        `);
        return result.rows.map(row => ({
            ...row,
            distance: row.distance ? parseFloat(row.distance) : null,
            startDate: row.startDate ? new Date(row.startDate).toISOString() : null,
            endDate: row.endDate ? new Date(row.endDate).toISOString() : null,
        }));
    }

    // Получить маршрут по ID
    static async getById(routeId: number) {
        const result = await pool.query('SELECT * FROM "Routes" WHERE "routeId" = $1', [routeId]);
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
            ...row,
            distance: row.distance ? parseFloat(row.distance) : null,
            startDate: row.startDate ? new Date(row.startDate).toISOString() : null,
            endDate: row.endDate ? new Date(row.endDate).toISOString() : null,
        };
    }

    // Создать маршрут
    static async create(data: Omit<Route, 'routeId' | 'createdAt'>) {
        const { departurePoint, destinationPoint, startDate, endDate, distance, orderId, vehicleId, driverId } = data;
        const result = await pool.query(
            `INSERT INTO "Routes" ("departurePoint", "destinationPoint", "startDate", "endDate", distance, "orderId", "vehicleId","driverId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
            [departurePoint, destinationPoint, startDate, endDate, distance, orderId, vehicleId || null, driverId || null]
        );
        return result.rows[0];
    }

    // Обновить маршрут
    static async update(routeId: number, data: Partial<Route>) {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        const allowedFields = [
            'departurePoint', 'destinationPoint', 'startDate', 'endDate',
            'distance', 'orderId', 'vehicleId', 'driverId'
        ];

        for (const field of allowedFields) {
            // @ts-ignore
            if (field in data && data[field]  !== undefined) {
                fields.push(`${field} = $${paramIndex}`);
                // @ts-ignore
                values.push(data[field]);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            throw new Error('Нечего обновлять');
        }

        values.push(routeId);
        const query = `
    UPDATE routes
    SET ${fields.join(', ')}
    WHERE routeId = $${paramIndex}
    RETURNING *
  `;

        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }

    // Удалить маршрут
    static async delete(routeId: number) {
        const result = await pool.query('DELETE FROM "Routes" WHERE "routeId" = $1', [routeId]);
        return result.rowCount! > 0;
    }
}

export default RouteModel;