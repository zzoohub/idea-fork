from shared.slugify import slugify


def test_slugify_basic():
    assert slugify("Hello World") == "hello-world"


def test_slugify_special_characters():
    assert slugify("AI/ML & Data!") == "ai-ml-data"


def test_slugify_leading_trailing_separators():
    assert slugify("  --My App--  ") == "my-app"


def test_slugify_numbers_preserved():
    assert slugify("App 2.0") == "app-2-0"


def test_slugify_empty_string():
    assert slugify("") == ""


def test_slugify_already_lowercase():
    assert slugify("myapp") == "myapp"


def test_slugify_collapses_multiple_separators():
    assert slugify("one   two   three") == "one-two-three"
