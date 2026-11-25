/** Conteúdo do access token: só identifica a conta. */
export interface JwtPayload {
  sub: string;
}

/** O que fica em `req.user` depois do JwtAuthGuard. */
export interface AuthenticatedUser {
  id: string;
}
