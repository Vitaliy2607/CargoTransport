import bcrypt from 'bcryptjs';
import ClientModel from "../models/users/clients-model";
import LogisticianModel from "../models/users/logistician-model";
import DriverModel from "../models/users/drivers-model";
import AdminModel from "../models/users/admins-model";

type User = {
    id: number;
    role: 'client' | 'driver' | 'logistician' | 'admin';
    email?: string;
    licenseNumber?: string;
    firstName: string;
    lastName: string;
    patronymic: string;
    phone: string;
}

async function authenticateUser(
    identifier: string,
    password: string
): Promise<User | null> {
    let user: any = null;

    // Попробуем найти по email (клиент или логист)
    user = await ClientModel.findByEmail(identifier);
    if (user) {
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
            return {
                id: user.clientId,
                role: 'client',
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                patronymic: user.patronymic,
                phone: user.phone,
            };
        }
    }

    user = await LogisticianModel.findByEmail(identifier);
    if (user) {
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
            return {
                id: user.logisticianId,
                role: 'logistician',
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                patronymic: user.patronymic,
                phone: user.phone,
            };
        }
    }

    // Попробуем найти по номеру лицензии (водитель)
    user = await DriverModel.findByEmail(identifier);
    if (user) {
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
          return {
                id: user.driverId,
                role: 'driver',
                licenseNumber: user.licenseNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                patronymic: user.patronymic,
                phone: user.phone,
            };
        }

    }
    user = await AdminModel.findByEmail(identifier);
    if (user) {
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
            return {
                id: user.adminId,
                role: 'admin',
                licenseNumber: user.licenseNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                patronymic: user.patronymic,
                phone: user.phone,
            };
        }

    }

    return null;
}

export default authenticateUser;