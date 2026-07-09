import http from "@/src/lib/http"

const dishSnapshotApiRequest = {

    getId: (dishId: number) => http.get<{ message: string; data: { id: number } }>(
        `/dish-snapshot/by-dish/${dishId}`,
        { service: 'menu' }
    )


}

export default dishSnapshotApiRequest
