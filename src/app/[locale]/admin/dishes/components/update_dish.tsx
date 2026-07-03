import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/src/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/src/components/ui/select"
import { Button } from "@/src/components/ui/button"
import { useEffect, useState } from "react"
import { DishDto, UpdateDishBodyType } from "@/src/schema/dish.schema"
import { useUpdateDishMutation } from "@/src/queries/useDish"
import { toast } from "sonner"
import ImageUpload from "./upload_image"
import { handleImageURL } from "@/src/lib/utils"

const UpdateDish = (props: {
    isUpdateModalOpen: boolean;
    setIsUpdateModalOpen: (open: boolean) => void;
    dish?: DishDto | null;
}) => {
    const { isUpdateModalOpen, setIsUpdateModalOpen, dish } = props

    const [editDish, setEditDish] = useState<UpdateDishBodyType>({
        name: "",
        price: 0,
        description: "",
        image: null,
        category: "MainCourse",
    })

    const categories = [
        { label: "Main Course", value: "MainCourse" },
        { label: "Dessert", value: "Dessert" },
        { label: "Beverage", value: "Beverage" },
    ]

    // Populate form when dish changes
    useEffect(() => {
        if (dish) {
            setEditDish({
                name: dish.name,
                price: dish.price,
                description: dish.description ?? "",
                image: null,          // reset to null — existing image shown via existingUrl prop
                category: dish.category,
            })
        }
    }, [dish])

    const updateMutation = useUpdateDishMutation()

    const handleUpdateDish = () => {
        if (!dish) return
        updateMutation.mutate(
            { id: dish.id, ...editDish },
            {
                onSuccess: () => {
                    toast.success("Dish updated successfully")
                    setIsUpdateModalOpen(false)
                },
            }
        )
    }

    // Build preview URL for the existing image
    const existingImageUrl = handleImageURL(dish?.imagePath ?? '')

    return (
        <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
            <DialogContent className="max-w-lg rounded-lg border-border-subtle bg-card p-0 shadow-modal">
                <DialogHeader className="border-b border-border-subtle p-6">
                    <DialogTitle className="text-lg font-bold uppercase tracking-wide text-foreground">
                        Update Dish
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 p-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Name
                        </label>
                        <input
                            type="text"
                            value={editDish.name}
                            onChange={(e) => setEditDish({ ...editDish, name: e.target.value })}
                            placeholder="Enter dish name"
                            className="h-10 w-full rounded-md border border-input-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-gold-primary/20 focus:outline-none"
                        />
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Price (VND)
                        </label>
                        <input
                            type="number"
                            value={editDish.price}
                            onChange={(e) => setEditDish({ ...editDish, price: Number(e.target.value) })}
                            placeholder="Enter price"
                            className="h-10 w-full rounded-md border border-input-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-gold-primary/20 focus:outline-none"
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Category
                        </label>
                        <Select
                            value={editDish.category}
                            onValueChange={(value) =>
                                setEditDish({ ...editDish, category: value } as UpdateDishBodyType)
                            }
                        >
                            <SelectTrigger className="h-10 w-full rounded-md border-input-border bg-input text-foreground hover:bg-input focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-md border-border-subtle bg-surface">
                                {categories.map((category) => (
                                    <SelectItem
                                        key={category.value}
                                        value={category.value}
                                        className="text-foreground focus:bg-gold-subtle focus:text-foreground"
                                    >
                                        {category.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Description
                        </label>
                        <textarea
                            value={editDish.description}
                            onChange={(e) => setEditDish({ ...editDish, description: e.target.value })}
                            placeholder="Enter dish description"
                            rows={3}
                            className="w-full resize-none rounded-md border border-input-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-gold-primary/20 focus:outline-none"
                        />
                    </div>

                    {/* Image Upload — NEW */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Image
                        </label>
                        <ImageUpload
                            value={editDish.image instanceof File ? editDish.image : null}
                            existingUrl={existingImageUrl}
                            onChange={(file) => setEditDish({ ...editDish, image: file })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Upload a new image to replace the current one, or leave as-is to keep it.
                        </p>
                    </div>
                </div>

                <DialogFooter className="border-t border-border-subtle p-6">
                    <Button
                        variant="outline"
                        onClick={() => setIsUpdateModalOpen(false)}
                        className="rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle hover:text-foreground"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={handleUpdateDish}
                        disabled={updateMutation.isPending}
                        className="rounded-md bg-primary font-bold uppercase tracking-wide text-primary-foreground shadow-md hover:shadow-gold"
                    >
                        {updateMutation.isPending ? 'Updating...' : 'Update Dish'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UpdateDish;