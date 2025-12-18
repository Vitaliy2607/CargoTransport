// src/backend/models/vehicle.model.ts

import pool from "../db/db";

interface Vehicle {
    id: number;
    brand: string;
    model: string;
    licensePlate: string;
    capacity: number | null;
    isWorking: boolean;
    createdAt: Date;
}

class VehicleModel {
    static async getAll() {
        const result = await pool.query(`
      SELECT "vehicleId", brand, model, "licensePlate", capacity, "isWorking"
      FROM "Vehicles"
      ORDER BY brand, model
    `);
        return result.rows.map(row => ({
            ...row,
            capacity: row.capacity ? parseFloat(row.capacity) : null,
        }));
    }
}

export default VehicleModel;