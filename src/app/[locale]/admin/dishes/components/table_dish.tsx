import { Button } from "@/src/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/src/components/ui/table"
import { cn, formatCurrency, handleImageURL } from "@/src/lib/utils";
import { Pencil, Trash2 } from "lucide-react"
import Image from "next/image";
import { DishDto } from "@/src/schema/dish.schema";
import { useDeleteDishMutation } from "@/src/queries/useDish";


function StatusPill({ status }: { status: string }) {
    const styles = {
        available: "bg-green-500/20 text-green-400 rounded-full",
        unavailable: "bg-white/8 text-muted-foreground rounded-full",
        hidden: "bg-white/8 text-muted-foreground rounded-full",
    }

    return (
        <span
            className={cn(
                "inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wider",
                styles[status as keyof typeof styles]
            )}
        >
            {status}
        </span>
    )
}
const TableDish = (props: {
    filteredDishes: DishDto[]
    setSelectedDish: (dish: DishDto) => void
    setIsUpdateModalOpen: (open: boolean) => void
}) => {
    const { filteredDishes, setSelectedDish, setIsUpdateModalOpen } = props
    const deleteMutation = useDeleteDishMutation()
    const handleDeleteDish = (id: number) => {
        deleteMutation.mutate(id)
    }

    return (
        <Table>
            <TableHeader>
                <TableRow className="border-border-subtle hover:bg-transparent">
                    <TableHead className="w-16 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Image
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Name
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Category
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Price
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Status
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Actions
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredDishes.map((dish) => (
                    <TableRow
                        key={dish.id}
                        className="border-border-subtle transition-colors hover:bg-gold-subtle/30"
                    >
                        <TableCell>
                            <div className="relative h-12 w-12 overflow-hidden rounded-md bg-surface">
                                <Image
                                    src={handleImageURL(dish.imagePath ?? '') ?? ''}
                                    alt={dish.name}
                                    fill
                                    className="object-cover"
                                />

                            </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                            {dish.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                            {dish.category}
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                            {formatCurrency(dish.price)}
                        </TableCell>
                        <TableCell>
                            <StatusPill status={dish.status} />
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                <Button
                                    onClick={() => {
                                        setSelectedDish(dish)
                                        setIsUpdateModalOpen(true)
                                    }}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-md text-foreground hover:bg-gold-subtle hover:text-foreground"
                                >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                    onClick={() => handleDeleteDish(dish.id)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-md text-foreground hover:bg-destructive/20 hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default TableDish;