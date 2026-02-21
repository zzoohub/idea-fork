class BriefNotFoundError(Exception):
    def __init__(self, identifier: str) -> None:
        self.identifier = identifier
        super().__init__(f"Brief '{identifier}' does not exist.")
