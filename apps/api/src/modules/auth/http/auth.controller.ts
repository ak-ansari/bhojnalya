// /api/v1/auth: sign-in, refresh, sign-out and password reset (TRD §13). All
// @Public: the caller has no principal yet, and each use case finds the tenant
// itself. The refresh token travels only in an httpOnly, Secure, SameSite=Strict
// cookie scoped to this path; the access token is in the body.
import {
  AuthSession,
  LoginRequest,
  PasswordResetConfirm,
  PasswordResetRequest,
} from '@bhojnalya/contracts';
import { Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';

import { Public } from '../../../platform/tenancy/public.decorator.js';
import { Returns, ZodBody } from '../../../platform/validation/zod.js';
import { REFRESH_TOKEN_TTL_MS } from '../domain/policy.js';
import { AuthService } from '../app/auth.service.js';
import type { SignedIn } from '../app/auth.service.js';

export const REFRESH_COOKIE = 'bhojnalya_rt';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

@Controller('auth')
@Public()
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Returns(200, 'Signed in; the refresh token is set as a cookie', AuthSession)
  @Returns(401, 'INVALID_CREDENTIALS')
  async login(
    @ZodBody(LoginRequest) body: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    return withRefreshCookie(res, await this.auth.login(body));
  }

  @Post('refresh')
  @HttpCode(200)
  @Returns(200, 'A new access token; the refresh cookie is replaced', AuthSession)
  @Returns(401, 'The refresh token is missing, expired, revoked or already used')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    try {
      return withRefreshCookie(res, await this.auth.refresh(refreshCookieOf(req)));
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  @Returns(204, 'Signed out; the refresh token and its family are revoked')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(refreshCookieOf(req));
    clearRefreshCookie(res);
  }

  @Post('password-reset/request')
  @HttpCode(202)
  @Returns(202, 'If the email belongs to an account, a code was sent to it')
  async requestPasswordReset(
    @ZodBody(PasswordResetRequest) body: PasswordResetRequest,
  ): Promise<void> {
    await this.auth.requestPasswordReset(body.email);
  }

  @Post('password-reset/confirm')
  @HttpCode(204)
  @Returns(204, 'The password is changed and every session is signed out')
  @Returns(400, 'INVALID_RESET_CODE')
  async confirmPasswordReset(
    @ZodBody(PasswordResetConfirm) body: PasswordResetConfirm,
  ): Promise<void> {
    await this.auth.confirmPasswordReset(body);
  }
}

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: REFRESH_COOKIE_PATH,
};

function withRefreshCookie(res: Response, signedIn: SignedIn): AuthSession {
  res.cookie(REFRESH_COOKIE, signedIn.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
  return signedIn.session;
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, COOKIE_OPTIONS);
}

// Express has no cookie parser by default; this route needs only one cookie.
function refreshCookieOf(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (header === undefined) return undefined;
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === REFRESH_COOKIE) return value.join('=');
  }
  return undefined;
}
