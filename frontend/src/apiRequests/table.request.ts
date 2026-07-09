import http from '../lib/http'
import { ReservationTableDto } from '../schema/reservation.schema';

import { TableListResType, TableResType, CreateTableBodyType, UpdateTableStatusBodyType } from '../schema/table.schema';

const tableApiRequest = {
    getAll: (page = 1, pageSize = 50) =>
        http.get<{ data: TableListResType }>(`/table?page=${page}&pageSize=${pageSize}`, { service: 'order' }),

    getById: (id: number) =>
        http.get<TableResType>(`/table/${id}`, { service: 'order' }),

    create: (body: CreateTableBodyType) =>
        http.post<TableResType>('/table', body, { service: 'order' }),

    updateStatus: (id: number, body: UpdateTableStatusBodyType) =>
        http.patch<TableResType>(`/table/${id}/status`, body, { service: 'order' }),

    // ← NEW: toggle isVisibleOnReservation
    updateVisibility: (tableNumber: number, isVisibleOnReservation: boolean) =>
        http.patch<TableResType>(`/table/${tableNumber}/visibility`, { isVisibleOnReservation }, { service: 'order' }),
    /** Staff calls reset when a guest leaves — generates new SessionId, sets status Hidden */
    reset: (id: number) =>
        http.patch<TableResType>(`/table/${id}/reset`, null, { service: 'order' }),

    delete: (id: number) =>
        http.delete<TableResType>(`/table/${id}`, { service: 'order' }),

    getAvailableForReservation: () =>
        http.get<{ message: string; data: ReservationTableDto[] }>(
            '/table/reservation-available',
            { service: 'order' }
        ),
}

export default tableApiRequest

