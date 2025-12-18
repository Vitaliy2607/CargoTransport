// src/backend/models/cargo.model.ts

import pool from "../db/db";

interface Cargo {
    cargoId: number;
    name: string;
    weight: number | null;
    volume: number | null;
    dangerous: string | null;
    fragility: string | null;
    orderId: number;
    warehouseId: number | null;
    createdAt: Date;
}

class CargoModel {
    // Получить все грузы по orderId
    static async getByOrderId(orderId: number) {
        const result = await pool.query(`
      SELECT * FROM "Cargoes" WHERE "orderId" = $1 ORDER BY "createdAt" DESC
    `, [orderId]);
        return result.rows.map(row => ({
            ...row,
            weight: row.weight ? parseFloat(row.weight) : null,
            volume: row.volume ? parseFloat(row.volume) : null,
            createdAt: new Date(row.createdAt).toISOString(),
        }));
    }

    // Создать груз
    static async create(data: Omit<Cargo, 'cargoId' | 'createdAt'>) {
        const { name, weight, volume, dangerous, fragility, orderId, warehouseId } = data;
        const result = await pool.query(
            `INSERT INTO "Cargoes" (name, weight, volume, dangerous, fragility, "orderId", "warehouseId")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [name, weight || null, volume || null, dangerous || null, fragility || null, orderId, warehouseId || null]
        );
        return result.rows[0];
    }

    // Обновить груз
    static async update(
        cargoId: number,
        name: string,
        weight: number | null,
        volume: number | null,
        dangerous: string | null,
        fragility: string | null,
        warehouseId: number | null
    ) {
        const result = await pool.query(
            `UPDATE "Cargoes"
     SET name = $1,
         weight = $2,
         volume = $3,
         dangerous = $4,
         fragility = $5,
         "warehouseId" = $6
     WHERE "cargoId" = $7
     RETURNING *`,
            [name, weight, volume, dangerous, fragility, warehouseId, cargoId]
        );
        return result.rows[0] || null;
    }

    // Удалить груз
    static async delete(cargoId: number) {
        const result = await pool.query('DELETE FROM "Cargoes" WHERE "cargoId" = $1', [cargoId]);
        return result.rowCount! > 0;
    }
}

export default CargoModel;