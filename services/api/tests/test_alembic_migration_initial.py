"""Tests for alembic/versions/a31dbf9701cd_initial_schema.py.

Verifies:
- The migration file can be imported without errors.
- Module-level metadata (revision, down_revision, branch_labels, depends_on) is correct.
- upgrade() calls the expected Alembic ``op`` helpers without raising.
- downgrade() calls the expected Alembic ``op`` helpers without raising.

All Alembic ``op`` calls are mocked so no real database connection is needed.

The module is loaded from its absolute path using importlib.util.spec_from_file_location
so that the test suite works regardless of the working directory.
"""
import importlib.util
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Absolute path to the migration module.
# Test file lives at services/api/tests/test_alembic_migration_initial.py
# parents[0] = services/api/tests
# parents[1] = services/api   ← project root containing alembic/
_API_ROOT = Path(__file__).parents[1]
_MIGRATION_PATH = _API_ROOT / "alembic" / "versions" / "a31dbf9701cd_initial_schema.py"
_MIGRATION_MODULE_NAME = "alembic_migration_a31dbf9701cd"  # synthetic name


def _import_migration():
    """
    Fresh import of the migration module with ``alembic.op`` fully mocked.

    Returns (module, mock_op).
    """
    sys.modules.pop(_MIGRATION_MODULE_NAME, None)
    mock_op = MagicMock()

    spec = importlib.util.spec_from_file_location(_MIGRATION_MODULE_NAME, _MIGRATION_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MIGRATION_MODULE_NAME] = module

    with patch("alembic.op", mock_op):
        spec.loader.exec_module(module)

    return module, mock_op


# ---------------------------------------------------------------------------
# Module-level metadata
# ---------------------------------------------------------------------------


class TestMigrationMetadata:
    """Verify the migration's identity fields."""

    def test_revision_id(self):
        """revision must match the filename prefix."""
        mod, _ = _import_migration()
        assert mod.revision == "a31dbf9701cd"

    def test_down_revision_is_none(self):
        """This is the initial migration — down_revision should be None."""
        mod, _ = _import_migration()
        assert mod.down_revision is None

    def test_branch_labels_is_none(self):
        """No branch labels for the initial migration."""
        mod, _ = _import_migration()
        assert mod.branch_labels is None

    def test_depends_on_is_none(self):
        """No explicit dependencies for the initial migration."""
        mod, _ = _import_migration()
        assert mod.depends_on is None

    def test_module_imports_without_error(self):
        """The module must be importable with no side-effects beyond attribute binding."""
        mod, _ = _import_migration()
        assert mod is not None

    def test_upgrade_is_callable(self):
        """upgrade() must be a callable."""
        mod, _ = _import_migration()
        assert callable(mod.upgrade)

    def test_downgrade_is_callable(self):
        """downgrade() must be a callable."""
        mod, _ = _import_migration()
        assert callable(mod.downgrade)


# ---------------------------------------------------------------------------
# upgrade()
# ---------------------------------------------------------------------------


class TestUpgrade:
    """Tests for the upgrade() function."""

    def test_upgrade_runs_without_raising(self):
        """upgrade() completes without any exception when op is mocked."""
        mod, _ = _import_migration()
        mod.upgrade()  # must not raise

    def test_upgrade_executes_pg_trgm_extension(self):
        """upgrade() must create the pg_trgm extension."""
        mod, mock_op = _import_migration()
        mod.upgrade()

        executed_sqls = [str(c.args[0]) for c in mock_op.execute.call_args_list]
        assert any("pg_trgm" in sql for sql in executed_sqls), (
            "Expected 'pg_trgm' extension creation in op.execute calls"
        )

    def test_upgrade_creates_fn_set_updated_at(self):
        """upgrade() must create the fn_set_updated_at trigger function."""
        mod, mock_op = _import_migration()
        mod.upgrade()

        executed_sqls = [str(c.args[0]) for c in mock_op.execute.call_args_list]
        assert any("fn_set_updated_at" in sql for sql in executed_sqls)

    def test_upgrade_creates_fn_post_search_vector(self):
        """upgrade() must create the fn_post_search_vector trigger function."""
        mod, mock_op = _import_migration()
        mod.upgrade()

        executed_sqls = [str(c.args[0]) for c in mock_op.execute.call_args_list]
        assert any("fn_post_search_vector" in sql for sql in executed_sqls)

    def test_upgrade_creates_all_tables(self):
        """upgrade() must call op.create_table for every expected table."""
        expected_tables = {
            "cluster",
            "post",
            "product",
            "tag",
            "brief",
            "cluster_post",
            "post_tag",
            "product_post",
            "brief_source",
            "rating",
        }
        mod, mock_op = _import_migration()
        mod.upgrade()

        created = {c.args[0] for c in mock_op.create_table.call_args_list}
        assert expected_tables == created, (
            f"Unexpected or missing tables.\n"
            f"  Expected : {sorted(expected_tables)}\n"
            f"  Got      : {sorted(created)}"
        )

    def test_upgrade_creates_cluster_table(self):
        """op.create_table('cluster', …) is called during upgrade."""
        mod, mock_op = _import_migration()
        mod.upgrade()
        table_names = [c.args[0] for c in mock_op.create_table.call_args_list]
        assert "cluster" in table_names

    def test_upgrade_creates_post_table(self):
        """op.create_table('post', …) is called during upgrade."""
        mod, mock_op = _import_migration()
        mod.upgrade()
        table_names = [c.args[0] for c in mock_op.create_table.call_args_list]
        assert "post" in table_names

    def test_upgrade_creates_product_table(self):
        """op.create_table('product', …) is called during upgrade."""
        mod, mock_op = _import_migration()
        mod.upgrade()
        table_names = [c.args[0] for c in mock_op.create_table.call_args_list]
        assert "product" in table_names

    def test_upgrade_creates_tag_table(self):
        """op.create_table('tag', …) is called during upgrade."""
        mod, mock_op = _import_migration()
        mod.upgrade()
        table_names = [c.args[0] for c in mock_op.create_table.call_args_list]
        assert "tag" in table_names

    def test_upgrade_creates_brief_table(self):
        """op.create_table('brief', …) is called during upgrade."""
        mod, mock_op = _import_migration()
        mod.upgrade()
        table_names = [c.args[0] for c in mock_op.create_table.call_args_list]
        assert "brief" in table_names

    def test_upgrade_creates_rating_table(self):
        """op.create_table('rating', …) is called during upgrade."""
        mod, mock_op = _import_migration()
        mod.upgrade()
        table_names = [c.args[0] for c in mock_op.create_table.call_args_list]
        assert "rating" in table_names

    def test_upgrade_creates_triggers(self):
        """upgrade() creates the expected database triggers via op.execute."""
        expected_triggers = [
            "trg_post_updated_at",
            "trg_cluster_updated_at",
            "trg_brief_updated_at",
            "trg_product_updated_at",
            "trg_post_search_vector",
        ]
        mod, mock_op = _import_migration()
        mod.upgrade()

        executed_sqls = " ".join(str(c.args[0]) for c in mock_op.execute.call_args_list)
        for trigger in expected_triggers:
            assert trigger in executed_sqls, f"Trigger '{trigger}' not found in upgrade()"

    def test_upgrade_creates_named_indexes(self):
        """op.create_index is called for named indexes."""
        expected_indexes = [
            "idx_post_tag_tag_id",
            "idx_cluster_post_post_id",
            "idx_brief_cluster_id",
            "idx_brief_source_post_id",
            "idx_product_trending",
            "idx_product_complaints",
            "idx_product_post_post_id",
        ]
        mod, mock_op = _import_migration()
        mod.upgrade()

        created_index_names = {c.args[0] for c in mock_op.create_index.call_args_list}
        for idx in expected_indexes:
            assert idx in created_index_names, f"Index '{idx}' not created in upgrade()"

    def test_upgrade_creates_partial_indexes_via_execute(self):
        """Partial indexes (WHERE clause) are created via op.execute."""
        expected_partial = [
            "idx_post_feed",
            "idx_post_subreddit",
            "idx_post_search_vector",
            "idx_post_title_trgm",
            "idx_post_tagging_pending",
            "idx_cluster_active",
            "idx_brief_published",
            "idx_product_launched",
        ]
        mod, mock_op = _import_migration()
        mod.upgrade()

        executed_sqls = " ".join(str(c.args[0]) for c in mock_op.execute.call_args_list)
        for idx in expected_partial:
            assert idx in executed_sqls, (
                f"Partial index '{idx}' not found in op.execute calls during upgrade()"
            )

    def test_upgrade_total_execute_calls(self):
        """upgrade() makes exactly 16 op.execute calls
        (1 extension + 2 functions + 5 triggers + 8 partial indexes)."""
        mod, mock_op = _import_migration()
        mod.upgrade()
        assert mock_op.execute.call_count == 16

    def test_upgrade_total_create_table_calls(self):
        """upgrade() calls op.create_table exactly 10 times (one per table)."""
        mod, mock_op = _import_migration()
        mod.upgrade()
        assert mock_op.create_table.call_count == 10

    def test_upgrade_total_create_index_calls(self):
        """upgrade() calls op.create_index exactly 7 times for named indexes."""
        mod, mock_op = _import_migration()
        mod.upgrade()
        assert mock_op.create_index.call_count == 7


# ---------------------------------------------------------------------------
# downgrade()
# ---------------------------------------------------------------------------


class TestDowngrade:
    """Tests for the downgrade() function."""

    def test_downgrade_runs_without_raising(self):
        """downgrade() completes without any exception when op is mocked."""
        mod, _ = _import_migration()
        mod.downgrade()  # must not raise

    def test_downgrade_drops_all_tables(self):
        """downgrade() must call op.drop_table for every table created by upgrade."""
        expected_drops = {
            "rating",
            "brief_source",
            "product_post",
            "post_tag",
            "cluster_post",
            "brief",
            "tag",
            "product",
            "post",
            "cluster",
        }
        mod, mock_op = _import_migration()
        mod.downgrade()

        dropped = {c.args[0] for c in mock_op.drop_table.call_args_list}
        assert expected_drops == dropped, (
            f"Unexpected or missing drop_table calls.\n"
            f"  Expected : {sorted(expected_drops)}\n"
            f"  Got      : {sorted(dropped)}"
        )

    def test_downgrade_drops_tables_in_dependency_order(self):
        """Child tables (rating, brief_source, …) must be dropped before parents."""
        mod, mock_op = _import_migration()
        mod.downgrade()

        drop_order = [c.args[0] for c in mock_op.drop_table.call_args_list]

        # rating references brief → rating must come before brief
        assert drop_order.index("rating") < drop_order.index("brief")
        # brief_source references brief and post → before both
        assert drop_order.index("brief_source") < drop_order.index("brief")
        assert drop_order.index("brief_source") < drop_order.index("post")
        # cluster_post references cluster and post → before both
        assert drop_order.index("cluster_post") < drop_order.index("cluster")
        assert drop_order.index("cluster_post") < drop_order.index("post")
        # post_tag references post and tag → before both
        assert drop_order.index("post_tag") < drop_order.index("post")
        assert drop_order.index("post_tag") < drop_order.index("tag")
        # product_post references product and post → before both
        assert drop_order.index("product_post") < drop_order.index("product")
        assert drop_order.index("product_post") < drop_order.index("post")

    def test_downgrade_drops_fn_post_search_vector(self):
        """downgrade() drops the fn_post_search_vector function."""
        mod, mock_op = _import_migration()
        mod.downgrade()

        executed_sqls = " ".join(str(c.args[0]) for c in mock_op.execute.call_args_list)
        assert "fn_post_search_vector" in executed_sqls

    def test_downgrade_drops_fn_set_updated_at(self):
        """downgrade() drops the fn_set_updated_at function."""
        mod, mock_op = _import_migration()
        mod.downgrade()

        executed_sqls = " ".join(str(c.args[0]) for c in mock_op.execute.call_args_list)
        assert "fn_set_updated_at" in executed_sqls

    def test_downgrade_drops_pg_trgm_extension(self):
        """downgrade() drops the pg_trgm extension."""
        mod, mock_op = _import_migration()
        mod.downgrade()

        executed_sqls = " ".join(str(c.args[0]) for c in mock_op.execute.call_args_list)
        assert "pg_trgm" in executed_sqls

    def test_downgrade_total_drop_table_calls(self):
        """downgrade() calls op.drop_table exactly 10 times."""
        mod, mock_op = _import_migration()
        mod.downgrade()
        assert mock_op.drop_table.call_count == 10

    def test_downgrade_total_execute_calls(self):
        """downgrade() makes exactly 3 op.execute calls (2 functions + 1 extension)."""
        mod, mock_op = _import_migration()
        mod.downgrade()
        assert mock_op.execute.call_count == 3
