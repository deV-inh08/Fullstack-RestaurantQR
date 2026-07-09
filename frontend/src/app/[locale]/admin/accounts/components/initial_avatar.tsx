

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

const InitialsAvatar = ({ name }: { name: string }) => {
    return (
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-primary-foreground">{getInitials(name)}</span>
        </div>
    )
}

export default InitialsAvatar
