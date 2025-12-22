"""Alembic migration environment configuration.

이 파일은 Alembic이 마이그레이션을 실행할 때 사용하는 환경 설정입니다.
SQLModel 모델들을 import하고, autogenerate 기능을 위한 metadata를 설정합니다.
"""

import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlmodel import SQLModel

from alembic import context  # type: ignore[attr-defined]
from src.categories.models import Category, IdeaCategory  # noqa: F401
from src.generation.models import GenerationRequest  # noqa: F401

# =============================================================================
# SQLModel 모델 Import
# =============================================================================
# 중요: 모든 모델을 여기서 import 해야 Alembic이 테이블을 인식합니다.
# 새 모델을 추가할 때마다 여기에도 추가해야 합니다.
from src.ideas.models import Idea  # noqa: F401
from src.taxonomies.models import (  # noqa: F401
    FunctionType,
    IndustryType,
    TargetUserType,
)
from src.users.models import User  # noqa: F401

# =============================================================================
# Alembic 설정
# =============================================================================

config = context.config

# 환경변수에서 DB URL 가져오기 (alembic.ini의 값을 덮어씀)
# 이렇게 하면 비밀번호가 코드에 노출되지 않습니다.
database_url = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/idea_fork"
)
config.set_main_option("sqlalchemy.url", database_url)

# Python 로깅 설정
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# =============================================================================
# Autogenerate를 위한 Metadata 설정
# =============================================================================
# SQLModel.metadata는 모든 SQLModel 테이블 정의를 포함합니다.
# Alembic은 이 metadata와 실제 DB를 비교하여 마이그레이션을 생성합니다.

target_metadata = SQLModel.metadata


# =============================================================================
# Migration 실행 함수들
# =============================================================================


def run_migrations_offline() -> None:
    """오프라인 모드로 마이그레이션 실행.

    DB 연결 없이 SQL 스크립트만 생성합니다.
    `alembic upgrade head --sql` 명령어로 사용됩니다.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """실제 마이그레이션 실행."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # 아래 옵션들은 더 정확한 변경 감지를 위해 설정
        compare_type=True,  # 컬럼 타입 변경 감지
        compare_server_default=True,  # 기본값 변경 감지
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """비동기 엔진으로 마이그레이션 실행.

    asyncpg를 사용하므로 비동기로 실행합니다.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """온라인 모드로 마이그레이션 실행."""
    asyncio.run(run_async_migrations())


# 실행 모드에 따라 적절한 함수 호출
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
