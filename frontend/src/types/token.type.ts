export type decodedToken = {
    userId: number;
    role: string;
    tokenType: string;
    iat: number;
    exp: number;
}