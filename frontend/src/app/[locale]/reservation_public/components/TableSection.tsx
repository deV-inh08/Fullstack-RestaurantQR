import { ReservationTableDto } from "@/src/schema/reservation.schema"
import TableButton from "./TableButton"

// ─── Sub-components ───────────────────────────────────────────────────────────
function TableSection({
    title, tables, selected, onSelect,
}: {
    title: string
    tables: ReservationTableDto[]
    selected: ReservationTableDto | null
    onSelect: (t: ReservationTableDto) => void
}) {
    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{
                fontSize: 10, color: '#8A7F72',
                letterSpacing: '0.12em', fontWeight: 600, marginBottom: 12,
            }}>
                {title}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {tables.map(table => (
                    <TableButton
                        key={table.id}
                        table={table}
                        selected={selected?.id === table.id}
                        onClick={() => onSelect(table)}
                    />
                ))}
            </div>
        </div>
    )
}
export default TableSection;