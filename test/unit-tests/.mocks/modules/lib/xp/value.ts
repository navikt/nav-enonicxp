// Instants are stored as ISO strings in the mocked repos
export const instant = (value: string | Date) =>
    typeof value === 'string' ? value : value.toISOString();
