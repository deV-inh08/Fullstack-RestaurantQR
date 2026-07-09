import http from '../lib/http'
import type {
    CreateReservationBodyType,
    ReservationListResType,
    ReservationQueryParams,
    ReservationResType,
    UpdateDepositStatusBodyType,
    UpdateReservationBodyType,
    UpdateReservationStatusBodyType,
} from '../schema/reservation.schema'

/** Build query string from params, omitting undefined/null keys */
function buildQuery(params: ReservationQueryParams): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    if (!entries.length) return ''
    return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
}

const reservationApiRequest = {
    // ─── Staff / Admin: list with filters ────────────
    getAll: (params: ReservationQueryParams = {}) =>
        http.get<ReservationListResType>(
            `/reservation${buildQuery(params)}`,
            { service: 'reservation' }
        ),

    // ─── Staff / Admin: get one by id ─────────────────
    getById: (id: string) =>
        http.get<ReservationResType>(`/reservation/${id}`, { service: 'reservation' }),

    // ─── Public: guest creates reservation ────────────
    create: (body: CreateReservationBodyType) =>
        http.post<ReservationResType>('/reservation', body, { service: 'reservation' }),

    // ─── Staff / Admin: update details ────────────────
    update: (id: string, body: UpdateReservationBodyType) =>
        http.put<ReservationResType>(`/reservation/${id}`, body, { service: 'reservation' }),

    // ─── Staff / Admin: update status ─────────────────
    updateStatus: (id: string, body: UpdateReservationStatusBodyType) =>
        http.patch<ReservationResType>(`/reservation/${id}/status`, body, { service: 'reservation' }),

    // ─── Staff / Admin: update deposit ────────────────
    updateDeposit: (id: string, body: UpdateDepositStatusBodyType) =>
        http.patch<ReservationResType>(`/reservation/${id}/deposit`, body, { service: 'reservation' }),

    // ─── Admin only: hard delete ──────────────────────
    delete: (id: string) =>
        http.delete<ReservationResType>(`/reservation/${id}`, { service: 'reservation' }),
}

export default reservationApiRequest