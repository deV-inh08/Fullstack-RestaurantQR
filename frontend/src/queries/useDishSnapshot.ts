import dishSnapshotApiRequest from "@/src/apiRequests/dish_snapshot.request";
import { useQuery } from "@tanstack/react-query";


export const useGetIdDishSnapshot = (dishId: number) => {
    return useQuery({
        queryKey: ['id-dish-snapshot', dishId],
        queryFn: () => dishSnapshotApiRequest.getId(dishId),
        enabled: !!dishId,
    })
}

export const useGetListDishSnapshot = (dishId: number) => {
    return useQuery({
        queryKey: ['list-dish-snapshot', dishId],
        queryFn: () => dishSnapshotApiRequest.getId(dishId),
        enabled: !!dishId,
    })
}