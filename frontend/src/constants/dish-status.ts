export const DishStatus = {
    Available: 'Available',
    OutOfStock: 'OutOfStock',
} as const

export const DishStatusValues = [DishStatus.Available, DishStatus.OutOfStock] as const


export const CategoryStatus = {
    MainCourse: 'MainCourse',
    Dessert: 'Dessert',
    Beverage: 'Beverage',
} as const

export const CategoryStatusValues = [CategoryStatus.MainCourse, CategoryStatus.Dessert, CategoryStatus.Beverage] as const