class ProductNotFoundError(Exception):
    def __init__(self, slug: str) -> None:
        self.slug = slug
        super().__init__(f"Product with slug '{slug}' does not exist.")
