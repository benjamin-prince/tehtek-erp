"""Shared exceptions + registration for consistent error responses."""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base class for known business errors — mapped to 400 by default."""
    status_code: int = 400

    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class PermissionDeniedError(AppError):
    status_code = 403


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.__class__.__name__, "detail": exc.message},
        )