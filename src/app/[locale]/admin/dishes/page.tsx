"use client"

import { useState } from "react"
import Image from "next/image"
import { AdminHeader } from "@/src/components/admin/admin-header"
import { Button } from "@/src/components/ui/button"



import { Search, Plus, Pencil, Trash2, Upload } from "lucide-react"
import PaginationV1 from "@/src/components/pagination/pagination_v1"
import TableDish from "./components/table_dish"
import { useAddDishMutation, useDeleteDishMutation, useGetDishes, useUpdateDishMutation } from "@/src/queries/useDish"
import { CreateDishBodyType } from "@/src/schema/dish.schema"
import AddDish from "./components/add_dish"
import UpdateDish from "./components/update_dish"
import { DishDto } from "@/src/schema/dish.schema"


export default function DishesPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [selectedDish, setSelectedDish] = useState<DishDto | null>(null)

  const { data, isLoading } = useGetDishes()
  const dishes = data?.payload.data.data ?? []


  const filteredDishes = dishes.filter((dish) =>
    dish.name.toLowerCase().includes(searchQuery.toLowerCase())
  )


  return (
    <div className="min-h-screen">
      <AdminHeader title="Dishes" subtitle="Manage your menu items" />

      <div className="p-6">
        {/* Toolbar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-80 rounded-md border border-input-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-gold-primary/20 focus:outline-none"
            />
          </div>

          {/* Add Dish Button */}
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 gap-2 rounded-md bg-primary px-6 font-bold uppercase tracking-wide text-primary-foreground shadow-md transition-all hover:shadow-gold"
          >
            <Plus className="h-4 w-4" />
            Add Dish
          </Button>
        </div>

        {/* Data Table */}
        <div className="rounded-md border border-border-subtle bg-card shadow-card">
          <TableDish filteredDishes={filteredDishes} setSelectedDish={setSelectedDish} setIsUpdateModalOpen={setIsUpdateModalOpen}></TableDish>


        </div>
      </div>

      <AddDish
        isAddModalOpen={isAddModalOpen}
        setIsAddModalOpen={setIsAddModalOpen}
      ></AddDish>

      <UpdateDish
        isUpdateModalOpen={isUpdateModalOpen}
        setIsUpdateModalOpen={setIsUpdateModalOpen}
        dish={selectedDish}
      ></UpdateDish>
    </div>
  )
}
