class DuplicateRatingError(Exception):
    def __init__(self) -> None:
        super().__init__("This session has already rated this brief.")


class RatingNotFoundError(Exception):
    def __init__(self) -> None:
        super().__init__("No existing rating for this session and brief.")
