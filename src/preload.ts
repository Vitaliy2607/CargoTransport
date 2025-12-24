// Пример: экспорт чего-то в глобальный объект window
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    ping: () => ipcRenderer.invoke('ping'),
    login: (credentials: { identifier: string; password: string }) =>
        ipcRenderer.invoke('login', credentials),

    register: (userData: any) => ipcRenderer.invoke('register', userData),

    // Новый метод: запрос на изменение размера окна
    setWindowSize: (width: number, height: number) =>
        ipcRenderer.send('set-window-size', { width, height }),
    // В объекте electronAPI:
    openHelpWindow: () => ipcRenderer.send('open-help-window'),
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'), // ← новое
    logout: () => ipcRenderer.invoke('logout'),
    openLoginWindow: () => ipcRenderer.send('open-login-window'), // ← новое
    openDevTools: () => ipcRenderer.send('open-devtools'),
    getActiveOrders: () => ipcRenderer.invoke('get-active-orders'),
    createRoute: (data: any) => ipcRenderer.invoke('route-create', data),
    updateRoute: (routeId:number, data: any) => ipcRenderer.invoke('route-update', { routeId, data }),
    deleteRoute: (routeId: number) => ipcRenderer.invoke('route-delete', routeId),
    getAllRoutes: () => ipcRenderer.invoke('route-get-all'),
    getDrivers: () => ipcRenderer.invoke('get-drivers'),
    getVehicles: () => ipcRenderer.invoke('get-vehicles'),
    getRouteById: (routeId: number) => ipcRenderer.invoke('route-get-by-id', routeId),
    getHistoryRoutes: () => ipcRenderer.invoke('get-history-routes'),
    //----------------------------------clients-------------------------------
    getClientOrders: (clientId: number) => ipcRenderer.invoke('get-client-orders', clientId),
    createOrder: (data: any) => ipcRenderer.invoke('create-order', data),
    cancelOrder: (orderId: number) => ipcRenderer.invoke('cancel-order', orderId),
    getOrderDetails: (orderId: number) => ipcRenderer.invoke('get-order-details', orderId),
    getOrderForEdit: (orderId: number) => ipcRenderer.invoke('get-order-for-edit', orderId),
    updateOrder: ( data: any) => ipcRenderer.invoke('update-order', data),
    getDriverById: (driverId: number) => ipcRenderer.invoke('get-driver-by-id', driverId),
    getVehicleById: (vehicleId: number) => ipcRenderer.invoke('get-vehicle-by-id', vehicleId),
    //------------------------------drivers------------------------------
    getDriverRoutes: (driverId: number) => ipcRenderer.invoke('get-driver-routes', driverId),
    createRouteAsDriver: (data:any) => ipcRenderer.invoke('create-route-as-driver', data),
    updateRouteAsDriver: (routeId:number, data:any) => ipcRenderer.invoke('update-route-as-driver', { routeId, data }),
    deleteRouteAsDriver: (routeId:number) => ipcRenderer.invoke('delete-route-as-driver', routeId),
    getDriverViolations: (driverId: number) => ipcRenderer.invoke('get-driver-violations', driverId),
    getDriverRoutesForViolations: (driverId: number) => ipcRenderer.invoke('get-driver-routes-for-violations', driverId),
    createViolation: (data:any) => ipcRenderer.invoke('create-violation', data),
    updateViolation: (violationId:number, data:any) => ipcRenderer.invoke('update-violation', { violationId, data }),
    deleteViolation: (violationId:number) => ipcRenderer.invoke('delete-violation', violationId),
    getDriverFuel: (driverId: number) => ipcRenderer.invoke('get-driver-fuel', driverId),
    getDriverRoutesForFuel: (driverId: number) => ipcRenderer.invoke('get-driver-routes-for-fuel', driverId),
    createFuel: (data:any) => ipcRenderer.invoke('create-fuel', data),
    updateFuel: (fuelId:number, data:any) => ipcRenderer.invoke('update-fuel', { fuelId, data }),
    deleteFuel: (fuelId:number) => ipcRenderer.invoke('delete-fuel', fuelId),
    getAllVehicles: () => ipcRenderer.invoke('get-all-vehicles'),
    createVehicle: (data:any) => ipcRenderer.invoke('create-vehicle', data),
    updateVehicle: (vehicleId:number, data:any) => ipcRenderer.invoke('update-vehicle', { vehicleId, data }),
    deleteVehicle: (vehicleId:number) => ipcRenderer.invoke('delete-vehicle', vehicleId),
    //----------------------admins-------------------------------
    // Для админки
    getAdminTables: () => ipcRenderer.invoke('get-admin-tables'),
    getTableSchema: (tableName: string) => ipcRenderer.invoke('get-table-schema', tableName),
    getTableData: (tableName: string) => ipcRenderer.invoke('get-table-data', tableName),
    createTableRecord: (tableName: string, data: any) => ipcRenderer.invoke('create-table-record', { tableName, data }),
    updateTableRecord: (tableName: string, id: string, data: any) => ipcRenderer.invoke('update-table-record', { tableName, id, data }),
    deleteTableRecord: (tableName: string, id: string) => ipcRenderer.invoke('delete-table-record', { tableName, id }),
    // Для отчётов
    exportRevenueToExcel: () => ipcRenderer.invoke('export-revenue-excel'),
    exportRevenueToWord: () => ipcRenderer.invoke('export-revenue-word'),
});