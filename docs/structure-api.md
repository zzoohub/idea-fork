# API Folder Structure 

```
src/
├── app/
│   ├── main.py              # FastAPI app, lifespan
│   └── config.py            # pydantic-settings
├── domains/
│   ├── [domain]/
│   │   ├── router.py
│   │   ├── schemas.py       # Pydantic models
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── service.py       # service layer
│   │   └── dependencies.py  # dependency injection
│   └── [domain]/
│       └── ...
├── shared/
│   ├── database.py
│   └── exceptions.py
└── tests/
```
