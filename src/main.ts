import CargoModel from "./backend/models/cargoes-model";

process.env.PGCLIENTENCODING = 'UTF8';
import { app, BrowserWindow } from 'electron';
import * as path from "node:path";
import { ipcMain } from 'electron';
import authenticateUser from "./backend/application/auth";
import ClientModel from "./backend/models/users/clients-model";
import bcrypt from "bcryptjs";
import LogisticianModel from "./backend/models/users/logistician-model";
import AdminModel from "./backend/models/users/admins-model";
import DriverModel from "./backend/models/users/drivers-model";
import OrderModel from "./backend/models/orders-model";
import RouteModel from "./backend/models/routes-model";
import VehicleModel from "./backend/models/vehicles-models";
import pool from "./backend/db/db";
import {exportRevenueToExcel, exportRevenueToWord} from "./backend/reports/revenue.report";
let currentUser: { id: number; role: string; [key: string]: any } | null = null;

function createLoginWindow() {
    const win = new BrowserWindow({
        width: 500,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // будет сгенерирован из preload.ts
            contextIsolation: true,
        },
    });
    win.loadFile(path.join(__dirname, '../public/login.html'));
}

app.whenReady().then(() => {
    createLoginWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createLoginWindow();
        }
    });
});
ipcMain.on('open-login-window', () => {
    const loginWin = new BrowserWindow({
        width: 500,
        height: 600,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        },
    });

    const loginPath = path.join(__dirname, '../public/login.html');

    loginWin.loadFile(loginPath);
});
// Обработчик изменения размера окна
ipcMain.on('set-window-size', (event, { width, height }) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    if (win) {
        win.setSize(width, height);
        win.center(); // опционально: центрировать после изменения
    }
});
// Обработчик выхода из системы
ipcMain.handle('logout', () => {
    currentUser = null; // сбрасываем текущего пользователя
    return true;
});
ipcMain.handle('login', async (_event, credentials) => {
    try {
        const user = await authenticateUser(credentials.identifier, credentials.password);
        if (!user) {
            return { success: false, message: 'Неверный логин или пароль' };
        }
        currentUser = user; // ← сохраняем
        return { success: true, user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Ошибка сервера' };
    }
});
ipcMain.handle('register', async (_event, userData) => {
    const { role, email, password, firstName, lastName, patronymic, phone, licenseNumber } = userData;

    // ✅ Базовые проверки
    if (!role || !['client', 'driver', 'logistician', 'admin'].includes(role)) {
        return { success: false, message: 'Неверная роль' };
    }

    if (!firstName || !lastName || !phone || !password) {
        return { success: false, message: 'Обязательные поля не заполнены' };
    }

    if (password.length < 6) {
        return { success: false, message: 'Пароль должен быть не короче 6 символов' };
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12); // 12 — хороший баланс безопасности/скорости

        if (role === 'client') {
            if (!email) return { success: false, message: 'Email обязателен для клиента' };
            const existing = await ClientModel.findByEmail(email);
            if (existing) return { success: false, message: 'Клиент с таким email уже существует' };

            await ClientModel.create({
                firstName,
                lastName,
                patronymic: patronymic || '',
                email,
                password: hashedPassword,
                phone,
                address: '', // можно убрать или сделать опциональным в БД
            });

        } else if (role === 'logistician') {
            if (!email) return { success: false, message: 'Email обязателен для логиста' };
            const existing = await LogisticianModel.findByEmail(email);
            if (existing) return { success: false, message: 'Логист с таким email уже существует' };

            await LogisticianModel.create({
                firstName,
                lastName,
                patronymic: patronymic || '',
                email,
                password: hashedPassword,
                phone,
            });

        } else if (role === 'admin') {
            if (!email) return { success: false, message: 'Email обязателен для администратора' };
            const existing = await AdminModel.findByEmail(email);
            if (existing) return { success: false, message: 'Админ с таким email уже существует' };

            await AdminModel.create({
                firstName,
                lastName,
                patronymic: patronymic || '',
                email,
                password: hashedPassword,
                phone,
            });

        } else if (role === 'driver') {
            if (!licenseNumber) return { success: false, message: 'Номер водительского удостоверения обязателен' };
            const existing = await DriverModel.findByEmail(licenseNumber);
            if (existing) return { success: false, message: 'Водитель с таким удостоверением уже зарегистрирован' };

            await DriverModel.create({
                firstName,
                lastName,
                patronymic: patronymic || '',
                licenseNumber,
                phone,
                password: hashedPassword,
                isWorking: true,
            });

        } else {
            return { success: false, message: 'Неизвестная роль' };
        }

        return {
            success: true,
            message: 'Пользователь успешно зарегистрирован!',
            role,
        };

    } catch (error: any) {
        console.error('Ошибка регистрации:', error);
        // Логика для отлова нарушения уникальности (если вдруг пропустили)
        if (error.code === '23505') {
            return { success: false, message: 'Нарушение уникальности: пользователь уже существует' };
        }
        return { success: false, message: 'Ошибка при сохранении в базу данных' };
    }
});
ipcMain.handle('get-current-user', () => {
    return currentUser;
});
ipcMain.handle('get-active-orders', async () => {
    try {
        const orders = await OrderModel.getActiveOrders();
        console.log('Активные заказы:', orders); // ← добавь это
        return { success: true, orders };
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        return { success: false, message: 'Не удалось загрузить заказы' };
    }
});
ipcMain.handle('route-create', async (_event, data) => {
    try {
        const route = await RouteModel.create(data);
        return { success: true, route };
    } catch (error: any) {
        console.error('Ошибка создания маршрута:', error);
        return { success: false, message: error.message || 'Не удалось создать маршрут' };
    }
});

ipcMain.handle('route-update', async (_event, { routeId, data }) => {
    try {
        const route = await RouteModel.update(routeId, data);
        if (!route) return { success: false, message: 'Маршрут не найден' };
        return { success: true, route };
    } catch (error: any) {
        console.error('Ошибка обновления маршрута:', error);
        return { success: false, message: 'Вы не можете назначить водителя на рейс, тк водитель уже назначен!' };
    }
});

ipcMain.handle('route-delete', async (_event, routeId) => {
    try {
        const deleted = await RouteModel.delete(routeId);
        return { success: deleted, message: deleted ? 'Удалено' : 'Не найдено' };
    } catch (error: any) {
        console.error('Ошибка удаления маршрута:', error);
        return { success: false, message: 'Ошибка при удалении' };
    }
});

ipcMain.handle('route-get-all', async () => {
    try {
        const routes = await RouteModel.getAll();
        return { success: true, routes };
    } catch (error: any) {
        console.error('Ошибка загрузки маршрутов:', error);
        return { success: false, message: 'Не удалось загрузить маршруты' };
    }
});
ipcMain.handle('get-drivers', async () => {
    try {
        const drivers = await DriverModel.getAll();
        return { success: true, drivers };
    } catch (error: any) {
        console.error('Ошибка загрузки водителей:', error);
        return { success: false, message: 'Не удалось загрузить водителей' };
    }
});

// Получить весь транспорт
ipcMain.handle('get-vehicles', async () => {
    try {
        const vehicles = await VehicleModel.getAll();
        return { success: true, vehicles };
    } catch (error: any) {
        console.error('Ошибка загрузки транспорта:', error);
        return { success: false, message: 'Не удалось загрузить транспорт' };
    }
});
ipcMain.handle('route-get-by-id', async (_event, routeId: number) => {
    try {
        const route = await RouteModel.getById(routeId);
        if (!route) return { success: false, message: 'Маршрут не найден' };

        // Джойним заказ для описания
        const order = await pool.query('SELECT description FROM "Orders" WHERE "orderId" = $1', [route.orderId]);
        const orderDescription = order.rows[0]?.description || '';

        return {
            success: true,
            route: { ...route, orderDescription }
        };
    } catch (error: any) {
        console.error('Ошибка загрузки маршрута:', error);
        return { success: false, message: 'Ошибка при загрузке маршрута' };
    }
});
ipcMain.handle('get-history-routes', async () => {
    try {
        // Только завершённые рейсы: endDate не NULL и в прошлом
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
        o.description AS "orderDescription",
        o.price AS "orderPrice",
        d."firstName" AS "driverFirstName",
        d."lastName" AS "driverLastName",
        v.brand AS "vehicleBrand",
        v.model AS "vehicleModel",
        v."licensePlate" AS "vehicleLicensePlate"
      FROM "Routes" r
      JOIN "Orders" o ON r."orderId" = o."orderId"
      LEFT JOIN "Drivers" d ON r."driverId" = d."driverId"
      LEFT JOIN "Vehicles" v ON r."vehicleId" = v."vehicleId"
      WHERE r."endDate" IS NOT NULL 
        AND r."endDate" <= NOW()
      ORDER BY r."endDate" DESC
    `);
        return {
            success: true,
            routes: result.rows.map(row => ({
                ...row,
                distance: row.distance ? parseFloat(row.distance) : null,
                orderPrice: row.orderPrice ? parseFloat(row.orderPrice) : null,
                startDate: row.startDate ? new Date(row.startDate).toISOString() : null,
                endDate: row.endDate ? new Date(row.endDate).toISOString() : null,
            }))
        };
    } catch (error: any) {
        console.error('Ошибка загрузки истории рейсов:', error);
        return { success: false, message: 'Не удалось загрузить историю' };
    }
});
ipcMain.on('open-devtools', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.webContents.openDevTools();
});
ipcMain.handle('delete-driver', async (_event, driverId: number) => {
    try {
        // Сначала проверим, есть ли активные рейсы
        const check = await pool.query('SELECT 1 FROM "Routes" WHERE "driverId" = $1 LIMIT 1', [driverId]);
        if (check.rows.length > 0) {
            return { success: false, message: 'Нельзя удалить: водитель назначен на рейсы' };
        }

        const result = await pool.query('DELETE FROM "Drivers" WHERE "driverId" = $1', [driverId]);
        return { success: result.rowCount! > 0 };
    } catch (error: any) {
        console.error('Ошибка удаления водителя:', error);
        return { success: false, message: 'Ошибка БД' };
    }
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
//-------------------------Clients--------------------------------
// Получить заказы клиента
ipcMain.handle('get-client-orders', async (_event, clientId) => {
    try {
        const result = await pool.query(`
      SELECT "orderId", description, status, price, "createdAt"
      FROM "Orders"
      WHERE "clientId" = $1
      ORDER BY "createdAt" DESC
    `, [clientId]);
        return { success: true, orders: result.rows };
    } catch (error: any) {
        console.error('Ошибка загрузки заказов клиента:', error);
        return { success: false, message: 'Не удалось загрузить заказы' };
    }
});

// Создать заказ
ipcMain.handle('create-order', async (_event, data) => {
    try {
        const { clientId, description, startPoint, endPoint } = data;
        const result = await pool.query(
            `INSERT INTO "Orders" ("clientId", description, status, "createdAt")
       VALUES ($1, $2, 'created', NOW())
       RETURNING *`,
            [clientId, description]
        );
        const order = result.rows[0];



        return { success: true, order };
    } catch (error: any) {
        console.error('Ошибка создания заказа:', error);
        return { success: false, message: 'Не удалось создать заказ' };
    }
});

// Отменить заказ (только если статус = 'created')
ipcMain.handle('cancel-order', async (_event, orderId) => {
    try {
        const check = await pool.query(
            'SELECT status FROM "Orders" WHERE "orderId" = $1', [orderId]
        );
        if (check.rows.length === 0) return { success: false, message: 'Заказ не найден' };
        if (check.rows[0].status !== 'created') {
            return { success: false, message: 'Можно отменить только новый заказ' };
        }

        await pool.query('UPDATE "Orders" SET status = $1 WHERE orderId = $2', ['cancelled', orderId]);
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка отмены заказа:', error);
        return { success: false, message: 'Не удалось отменить заказ' };
    }
});

// Получить детали заказа (включая маршрут)
ipcMain.handle('get-order-details', async (_event, orderId) => {
    try {
        const order = await pool.query('SELECT * FROM "Orders" WHERE "orderId" = $1', [orderId]);
        if (order.rows.length === 0) return { success: false, message: 'Заказ не найден' };

        const route = await pool.query('SELECT * FROM "Routes" WHERE "routeId" = $1', [orderId]);

        return {
            success: true,
            order: order.rows[0],
            route: route.rows[0] || null // ← будет содержать routeId, driverId, vehicleId и даты
        };
    } catch (error: any) {
        console.error('Ошибка загрузки деталей:', error);
        return { success: false, message: 'Ошибка загрузки деталей' };
    }
});

// Уже есть в 'get-order-details', но для редактирования нужен отдельно маршрут
ipcMain.handle('get-order-for-edit', async (_event, orderId: number) => {
    try {
        const order = await pool.query('SELECT * FROM "Orders" WHERE "orderId" = $1', [orderId]);
        if (order.rows.length === 0) {
            return { success: false, message: 'Заказ не найден' };
        }

        const route = await pool.query('SELECT * FROM "Routes" WHERE "orderId" = $1', [orderId]);

        return {
            success: true,
            order: order.rows[0],
            route: route.rows[0] || null
        };
    } catch (error: any) {
        console.error('Ошибка загрузки заказа для редактирования:', error);
        return { success: false, message: 'Ошибка загрузки' };
    }
});


ipcMain.handle('update-order', async (_event, { orderId, orderData, routeData }) => {
    try {
        // Проверим статус — только 'created'
        const check = await pool.query('SELECT status FROM "Orders" WHERE "orderId" = $1', [orderId]);
        if (check.rows.length === 0) return { success: false, message: 'Заказ не найден' };
        if (check.rows[0].status !== 'created') {
            return { success: false, message: 'Можно редактировать только новые заказы' };
        }

        // Обновляем заказ
        await pool.query(
            'UPDATE "Orders" SET description = $1 WHERE "orderId" = $2',
            [orderData.description, orderId]
        );

        // Обновляем маршрут (если есть)
        if (routeData.routeId) {
            await pool.query(
                `UPDATE "Routes" 
         SET "departurePoint" = $1, "destinationPoint" = $2 
         WHERE "routeId" = $3`,
                [routeData.departurePoint, routeData.destinationPoint, routeData.routeId]
            );
        } else {
            // Или создаём, если не было
            await pool.query(
                `INSERT INTO "Routes" ("departurePoint", "destinationPoint", "orderId", "createdAt")
         VALUES ($1, $2, $3, NOW())`,
                [routeData.departurePoint, routeData.destinationPoint, orderId]
            );
        }

        return { success: true };
    } catch (error: any) {
        console.error('Ошибка обновления заказа:', error);
        return { success: false, message: 'Не удалось сохранить изменения' };
    }
});

//--------------------------------------------------------Drivers-----------------------------------------------------

ipcMain.handle('get-driver-routes', async (_event, driverId: number) => {
    try {
        const result = await pool.query(`
      SELECT 
        r."routeId",
        o."orderId",
        r."departurePoint",
        r."destinationPoint",
        r."startDate",
        r."endDate",
        o.status
      FROM "Routes" r
        JOIN "Orders" o ON r."orderId" = o."orderId"
      WHERE r."driverId" = $1
      ORDER BY r."startDate" DESC NULLS LAST
    `, [driverId]);

        return { success: true, routes: result.rows };
    } catch (error: any) {
        console.error('Ошибка загрузки рейсов водителя:', error);
        console.log(error);
        return { success: false, message: 'Не удалось загрузить рейсы' };
    }
})
// Создать рейс (водитель может только со своим driverId)
ipcMain.handle('create-route-as-driver', async (_event, data) => {
    try {
        const { orderId, departurePoint, destinationPoint, startDate, endDate, distance, driverId } = data;

        // Валидация: водитель может создавать только для себя
        if (!driverId) {
            return { success: false, message: 'Водитель не указан' };
        }

        const result = await pool.query(
            `
        INSERT INTO "Routes" ("orderId", "departurePoint", "destinationPoint", "startDate", "endDate", distance, "driverId", "createdAt","vehicleId")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(),2)
        RETURNING *`,
            [orderId, departurePoint, destinationPoint, startDate, endDate, distance, driverId]
        );
        return { success: true, route: result.rows[0] };
    } catch (error: any) {
        console.error('Ошибка создания рейса:', error);
        return { success: false, message: 'Не удалось создать рейс' };
    }
});

// Обновить рейс (только свой)
ipcMain.handle('update-route-as-driver', async (_event, { routeId, data }) => {
    try {
        const { departurePoint, destinationPoint, startDate, endDate, distance, driverId } = data;

        // Убедимся, что это его рейс
        const check = await pool.query('SELECT "driverId" FROM "Routes" WHERE "routeId" = $1', [routeId]);
        if (check.rows.length === 0) {
            return { success: false, message: 'Рейс не найден' };
        }
        if (check.rows[0].driverId !== driverId) {
            return { success: false, message: 'Нет прав на редактирование' };
        }

        const result = await pool.query(
            `UPDATE "Routes"
       SET "departurePoint" = $1,
           "destinationPoint" = $2,
           "startDate" = $3,
           "endDate" = $4,
           "distance" = $5
       WHERE "routeId" = $6
       RETURNING *`,
            [departurePoint, destinationPoint, startDate, endDate, distance, routeId]
        );
        return { success: true, route: result.rows[0] };
    } catch (error: any) {
        console.error('Ошибка обновления рейса:', error);
        return { success: false, message: 'Не удалось обновить рейс' };
    }
});

// Удалить рейс (только свой)
ipcMain.handle('delete-route-as-driver', async (_event, { routeId, driverId }) => {
    try {
        const check = await pool.query('SELECT "driverId" FROM "Routes" WHERE "routeId" = $1', [routeId]);
        if (check.rows.length === 0 || check.rows[0].driverId !== driverId) {
            return { success: false, message: 'Нет прав на удаление' };
        }

        await pool.query('DELETE FROM "Routes" WHERE routeId = $1', [routeId]);
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка удаления рейса:', error);
        return { success: false, message: 'Не удалось удалить рейс' };
    }
});
// Получить нарушения водителя
ipcMain.handle('get-driver-violations', async (_event, driverId: number) => {
    try {
        const result = await pool.query(`
      SELECT v.*, r."routeId", r."orderId"
      FROM "Violations" v
      JOIN "Routes" r ON v."routeId" = r."routeId"
      WHERE r."driverId" = $1
      ORDER BY v."occurredAt" DESC
    `, [driverId]);
        return { success: true, violations: result.rows };
    } catch (error: any) {
        console.error('Ошибка загрузки нарушений:', error);
        return { success: false, message: 'Не удалось загрузить нарушения' };
    }
});

// Получить рейсы водителя (для селекта при создании нарушения)
ipcMain.handle('get-driver-routes-for-violations', async (_event, driverId: number) => {
    try {
        const result = await pool.query(`
      SELECT "routeId", "orderId", "departurePoint", "destinationPoint"
      FROM "Routes"
      WHERE "driverId" = $1
      ORDER BY "startDate" DESC NULLS LAST
    `, [driverId]);
        return { success: true, routes: result.rows };
    } catch (error: any) {
        console.error('Ошибка загрузки рейсов для нарушений:', error);
        return { success: false, message: 'Не удалось загрузить рейсы' };
    }
});

// Создать нарушение
ipcMain.handle('create-violation', async (_event, data) => {
    try {
        const { routeId, type, description, amount, occurredAt } = data;
        await pool.query(
            `INSERT INTO "Violations" ("routeId", "type", "description", amount, "occurredAt", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
            [routeId, type, description || null, amount || null, occurredAt || new Date()]
        );
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка создания нарушения:', error);
        return { success: false, message: 'Не удалось добавить нарушение' };
    }
});

// Обновить нарушение
ipcMain.handle('update-violation', async (_event, { violationId, data }) => {
    try {
        const { type, description, amount, occurredAt } = data;
        await pool.query(
            `UPDATE "Violations"
       SET type = $1, description = $2, amount = $3, "occurredAt" = $4
       WHERE "violationId" = $5`,
            [type, description || null, amount || null, occurredAt, violationId]
        );
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка обновления нарушения:', error);
        return { success: false, message: 'Не удалось обновить нарушение' };
    }
});

// Удалить нарушение
ipcMain.handle('delete-violation', async (_event, violationId: number) => {
    try {
        await pool.query('DELETE FROM "Violations" WHERE "violationId" = $1', [violationId]);
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка удаления нарушения:', error);
        return { success: false, message: 'Не удалось удалить нарушение' };
    }
});
// Получить заправки водителя
ipcMain.handle('get-driver-fuel', async (_event, driverId: number) => {
    try {
        const result = await pool.query(`
      SELECT f.*, r."routeId", r."orderId"
      FROM "Fuel" f
      JOIN "Routes" r ON f."routeId" = r."routeId"
      WHERE r."driverId" = $1
      ORDER BY f."refuelDate" DESC
    `, [driverId]);
        return { success: true, fuel: result.rows };
    } catch (error: any) {
        console.error('Ошибка загрузки заправок:', error);
        return { success: false, message: 'Не удалось загрузить заправки' };
    }
});

// Получить рейсы водителя (для селекта)
ipcMain.handle('get-driver-routes-for-fuel', async (_event, driverId: number) => {
    try {
        const result = await pool.query(`
      SELECT "routeId", "orderId", "departurePoint", "destinationPoint"
      FROM "Routes"
      WHERE "driverId" = $1
      ORDER BY "startDate" DESC NULLS LAST
    `, [driverId]);
        return { success: true, routes: result.rows };
    } catch (error: any) {
        console.error('Ошибка загрузки рейсов для топлива:', error);
        return { success: false, message: 'Не удалось загрузить рейсы' };
    }
});

// Создать заправку
ipcMain.handle('create-fuel', async (_event, data) => {
    try {
        const { routeId, fuelType, volume, pricePerLiter, totalCost, refuelDate } = data;
        await pool.query(
            `INSERT INTO "Fuel" ("routeId", "fuelType", volume, "pricePerLiter", "totalCost", "refuelDate")
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [routeId, fuelType, volume, pricePerLiter, totalCost, refuelDate]
        );
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка создания заправки:', error);
        return { success: false, message: 'Не удалось добавить заправку' };
    }
});

// Обновить заправку
ipcMain.handle('update-fuel', async (_event, { fuelId, data }) => {
    try {
        const { routeId, fuelType, volume, pricePerLiter, totalCost, refuelDate } = data;
        await pool.query(
            `UPDATE "Fuel"
       SET "routeId" = $1, "fuelType" = $2, volume = $3, "pricePerLiter" = $4, "totalCost" = $5, "refuelDate" = $6
       WHERE "fuelId" = $7`,
            [routeId, fuelType, volume, pricePerLiter, totalCost, refuelDate, fuelId]
        );
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка обновления заправки:', error);
        return { success: false, message: 'Не удалось обновить заправку' };
    }
});

// Удалить заправку
ipcMain.handle('delete-fuel', async (_event, fuelId: number) => {
    try {
        await pool.query('DELETE FROM "Fuel" WHERE "fuelId" = $1', [fuelId]);
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка удаления заправки:', error);
        return { success: false, message: 'Не удалось удалить заправку' };
    }
});

// Получить все транспортные средства
ipcMain.handle('get-all-vehicles', async () => {
    try {
        const result = await pool.query(`
      SELECT 
        "vehicleId",
          "licensePlate" as "licensePlate",
        brand,
        model,
        capacity,
        "isWorking"
      FROM "Vehicles"
      ORDER BY brand, model
    `);

        return { success: true, vehicles: result.rows };
    } catch (error: any) {
        console.error('Ошибка загрузки транспорта:', error);
        return { success: false, message: 'Не удалось загрузить транспорт' };
    }
});
ipcMain.handle('get-vehicle-by-id', async (_event, vehicleId: number) => {
    try {
        const result = await pool.query(`
      SELECT * FROM "Vehicles"
      WHERE "vehicleId" = $1
    `,[vehicleId]);

        return { success: true, vehicles: result.rows };
    } catch (error: any) {
        console.error('Ошибка загрузки транспорта:', error);
        return { success: false, message: 'Не удалось загрузить транспорт' };
    }
});
ipcMain.handle('get-driver-by-id', async (_event, driverId: number) => {
    try {
        const result = await pool.query(`
      SELECT * FROM "Drivers"
      WHERE "driverId" = $1
    `,[driverId]);

        return { success: true, vehicles: result.rows };
    } catch (error: any) {
        console.error('Ошибка загрузки водителя:', error);
        return { success: false, message: 'Не удалось загрузить водителя' };
    }
});

// Создать ТС
ipcMain.handle('create-vehicle', async (_event, data) => {
    try {
        const { brand, model, licensePlate, capacity, isWorking } = data;
        await pool.query(
            `INSERT INTO "Vehicles" (brand, model, "licensePlate", capacity, "isWorking", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
            [brand, model, licensePlate, capacity, isWorking]
        );
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка создания ТС:', error);
        return { success: false, message: 'Не удалось добавить транспорт' };
    }
});

// Обновить ТС
ipcMain.handle('update-vehicle', async (_event, { vehicleId, data }) => {
    try {
        const { brand, model, licensePlate, capacity, isWorking } = data;
        await pool.query(
            `UPDATE "Vehicles"
       SET brand = $1, model = $2, "licensePlate" = $3, capacity = $4, "isWorking" = $5
       WHERE "vehicleId" = $6`,
            [brand, model, licensePlate, capacity, isWorking, vehicleId]
        );
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка обновления ТС:', error);
        return { success: false, message: 'Не удалось обновить транспорт' };
    }
});

// Удалить ТС
ipcMain.handle('delete-vehicle', async (_event, vehicleId: number) => {
    try {
        await pool.query('DELETE FROM "Vehicles" WHERE vehicleId = $1', [vehicleId]);
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка удаления ТС:', error);
        return { success: false, message: 'Не удалось удалить транспорт' };
    }
});

//--------------------------------admins---------------------------------------------------
// Список разрешённых таблиц для админа (безопасность!)
const ADMIN_ALLOWED_TABLES = [
    'Admins', 'Clients', 'Drivers', 'Logisticians',
    'Orders', 'Routes', 'Vehicles', 'Violations', 'Fuel', 'Cargoes', 'Warehouses'
];

// Получить список таблиц
ipcMain.handle('get-admin-tables', async () => {
    try {
        const result = await pool.query(`
      SELECT "tablename" 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename = ANY($1)
      ORDER BY tablename
    `, [ADMIN_ALLOWED_TABLES]);
        return { success: true, tables: result.rows.map(r => r.tablename) };
    } catch (error: any) {
        console.error('Ошибка загрузки таблиц:', error);
        return { success: false, message: 'Не удалось загрузить таблицы' };
    }
});

// Получить схему таблицы
ipcMain.handle('get-table-schema', async (_event, tableName: string) => {
    if (!ADMIN_ALLOWED_TABLES.includes(tableName)) {
        return { success: false, message: 'Доступ запрещён' };
    }
    try {
        const result = await pool.query(`
      SELECT "column_name", "data_type", "is_nullable", "column_default"
      FROM information_schema.columns
      WHERE "table_name" = $1
      ORDER BY "ordinal_position"
    `, [tableName]);
        return { success: true, schema: result.rows };
    } catch (error: any) {
        console.error('Ошибка схемы таблицы:', error);
        return { success: false, message: 'Не удалось загрузить схему' };
    }
});

// Получить данные таблицы
ipcMain.handle('get-table-data', async (_event, tableName: string) => {
    if (!ADMIN_ALLOWED_TABLES.includes(tableName)) {
        return { success: false, message: 'Доступ запрещён' };
    }
    try {
        const result = await pool.query(`SELECT * FROM "${tableName}" LIMIT 100`);
        return { success: true, data: result.rows };
    } catch (error: any) {
        console.error('Ошибка данных таблицы:', error);
        return { success: false, message: 'Не удалось загрузить данные' };
    }
});

// Создать запись
ipcMain.handle('create-table-record', async (_event, { tableName, data }) => {
    if (!ADMIN_ALLOWED_TABLES.includes(tableName)) {
        return { success: false, message: 'Доступ запрещён' };
    }
    try {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO "${tableName}" (${columns.join(', ')}) VALUES (${placeholders})`;
        await pool.query(query, values);
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка создания записи:', error);
        return { success: false, message: "Запись успешно добавлена" };
    }
});

// Обновить запись (предполагаем, что первичный ключ = первый столбец с *id)
ipcMain.handle('update-table-record', async (_event, { tableName, id, data }) => {
    if (!ADMIN_ALLOWED_TABLES.includes(tableName)) {
        return { success: false, message: 'Доступ запрещён' };
    }
    try {
        // Получим имя первичного ключа
        const schema = await pool.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `, [tableName]);

        const pkName = schema.rows.length > 0 ? schema.rows[0].attname : 'id';

        const columns = Object.keys(data);
        const values = Object.values(data);
        const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
        const query = `UPDATE ${tableName} SET ${setClause} WHERE ${pkName} = $${values.length + 1}`;
        await pool.query(query, [...values, id]);
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка обновления записи:', error);
        return { success: false, message:  'Запись успешно обновлена' };
    }
});

// Удалить запись
ipcMain.handle('delete-table-record', async (_event, { tableName, id }) => {
    if (!ADMIN_ALLOWED_TABLES.includes(tableName)) {
        return { success: false, message: 'Доступ запрещён' };
    }
    try {
        // Получим имя первичного ключа
        const schema = await pool.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `, [tableName]);

        const pkName = schema.rows.length > 0 ? schema.rows[0].attname : 'id';

        await pool.query(`DELETE FROM "${tableName}" WHERE ${pkName} = $1`, [id]);
        return { success: true };
    } catch (error: any) {
        console.error('Ошибка удаления записи:', error);
        return { success: false, message: 'Запись успешно удалена' };
    }
});

//---------------------------------------reports ------------------------------------
// Экспорт выручки
ipcMain.handle('export-revenue-excel', async () => {
    try {
        const filePath = await exportRevenueToExcel();
        return { success: true, filePath };
    } catch (error: any) {
        console.error('Ошибка экспорта Excel:', error);
        return { success: false, message: 'Не удалось создать файл' };
    }
});

ipcMain.handle('export-revenue-word', async () => {
    try {
        const filePath = await exportRevenueToWord();
        return { success: true, filePath };
    } catch (error: any) {
        console.error('Ошибка экспорта Word:', error);
        return { success: false, message: 'Не удалось создать файл' };
    }
});
ipcMain.on('open-help-window', () => {
    const helpWin = new BrowserWindow({
        width: 900,
        height: 700,
        resizable: true, // можно менять размер
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        },
    });

    const helpPath = path.join(__dirname, '../public/help/help.html');

    helpWin.loadFile(helpPath);
    helpWin.center();
});