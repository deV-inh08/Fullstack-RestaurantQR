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
import { Upload } from "lucide-react"
import ImageUpload from "./upload_image"
import { useState } from "react"
import { CreateDishBodyType } from "@/src/schema/dish.schema"
import { useAddDishMutation } from "@/src/queries/useDish"
import { toast } from "sonner"
const AddDish = (props: {
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void
}) => {
    const [newDish, setNewDish] = useState<CreateDishBodyType>({
        name: "",
        price: "",
        description: "",
        image: "",
        category: "MainCourse",
        status: "Available"
    })
    const categories = [
        { label: "Main Course", value: "MainCourse" },
        { label: "Dessert", value: "Dessert" },
        { label: "Beverage", value: "Beverage" }
    ];


    const addMutation = useAddDishMutation({
        onSuccess: () => {
            toast.success("Add Dish successfully")
            setIsAddModalOpen(false)
            setNewDish({
                name: "",
                price: "",
                description: "",
                image: "",
                category: "MainCourse",
                status: "Available"
            })
        }
    });
    const { isAddModalOpen, setIsAddModalOpen } = props
    const handleAddDish = (newDish: CreateDishBodyType) => {
        addMutation.mutate(newDish)
    }
    return (
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="max-w-lg rounded-lg border-border-subtle bg-card p-0 shadow-modal">
                <DialogHeader className="border-b border-border-subtle p-6">
                    <DialogTitle className="text-lg font-bold uppercase tracking-wide text-foreground">
                        Add New Dish
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

                            value={newDish.name}
                            onChange={(e) =>
                                setNewDish({ ...newDish, name: e.target.value })
                            }
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
                            value={newDish.price}
                            onChange={(e) =>
                                setNewDish({ ...newDish, price: e.target.value })
                            }
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
                            value={newDish.category}
                            onValueChange={(value) =>
                                setNewDish({ ...newDish, category: value } as CreateDishBodyType)
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
                            value={newDish.description}
                            onChange={(e) =>
                                setNewDish({ ...newDish, description: e.target.value })
                            }
                            placeholder="Enter dish description"
                            rows={3}
                            className="w-full resize-none rounded-md border border-input-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-gold-primary/20 focus:outline-none"
                        />
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Image
                        </label>
                        <ImageUpload
                            value={newDish.image as File | null}
                            onChange={(file) => setNewDish({ ...newDish, image: file as File | string })}
                        />
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Status
                        </label>
                        <Select
                            value={newDish.status}
                            onValueChange={(value) =>
                                setNewDish({ ...newDish, status: value } as CreateDishBodyType)
                            }
                        >
                            <SelectTrigger className="h-10 w-full rounded-md border-input-border bg-input text-foreground hover:bg-input focus:ring-0 focus:ring-offset-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-md border-border-subtle bg-surface">
                                <SelectItem
                                    value="available"
                                    className="text-foreground focus:bg-gold-subtle focus:text-foreground"
                                >
                                    Available
                                </SelectItem>
                                <SelectItem
                                    value="unavailable"
                                    className="text-foreground focus:bg-gold-subtle focus:text-foreground"
                                >
                                    Unavailable
                                </SelectItem>
                                <SelectItem
                                    value="hidden"
                                    className="text-foreground focus:bg-gold-subtle focus:text-foreground"
                                >
                                    Hidden
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="border-t border-border-subtle p-6">
                    <Button
                        variant="outline"
                        onClick={() => setIsAddModalOpen(false)}
                        className="rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle hover:text-foreground"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={() => handleAddDish(newDish)}
                        className="rounded-md bg-primary font-bold uppercase tracking-wide text-primary-foreground shadow-md hover:shadow-gold"
                    >
                        Save Dish
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
};

export default AddDish;