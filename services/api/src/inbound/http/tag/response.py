from inbound.http.response import ResponseData


class TagResponseData(ResponseData):
    id: int
    slug: str
    name: str
