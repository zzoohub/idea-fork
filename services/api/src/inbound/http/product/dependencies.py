from enum import Enum

from fastapi import Query

from domain.product.models import ProductListParams


class ProductSortField(str, Enum):
    TRENDING_SCORE_DESC = "-trending_score"
    COMPLAINT_COUNT_DESC = "-complaint_count"


def get_product_list_params(
    cursor: str | None = Query(None, max_length=2048),
    limit: int = Query(20, ge=1, le=100),
    sort: ProductSortField = Query(ProductSortField.TRENDING_SCORE_DESC),
    category: str | None = Query(None, max_length=100),
) -> ProductListParams:
    return ProductListParams(
        cursor=cursor, limit=limit, sort=sort.value, category=category
    )
