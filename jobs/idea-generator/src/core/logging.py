"""
Logging configuration for the idea generator.

Provides structured logging with JSON format support for production.
"""

import logging
import sys
from datetime import datetime, timezone
from typing import Any

from src.core.config import settings


class JsonFormatter(logging.Formatter):
    """JSON log formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        if hasattr(record, "extra"):
            log_data.update(record.extra)

        import json

        return json.dumps(log_data)


class ConsoleFormatter(logging.Formatter):
    """Human-readable console formatter for development."""

    COLORS = {
        "DEBUG": "\033[36m",  # Cyan
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        return (
            f"{timestamp} | {color}{record.levelname:8}{self.RESET} | "
            f"{record.name} | {record.getMessage()}"
        )


def setup_logging() -> None:
    """Configure logging for the application."""
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.log_level.upper())

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(settings.log_level.upper())

    # Use JSON format in production, console format in debug mode
    if settings.debug:
        console_handler.setFormatter(ConsoleFormatter())
    else:
        console_handler.setFormatter(JsonFormatter())

    root_logger.addHandler(console_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.debug else logging.WARNING
    )


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the specified name.

    Args:
        name: Logger name, typically __name__ from calling module.

    Returns:
        Configured logger instance.
    """
    return logging.getLogger(name)
