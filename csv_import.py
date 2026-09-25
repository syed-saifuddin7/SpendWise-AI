import csv
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation

REQUIRED_COLUMNS = ("name", "amount", "category", "date")
OPTIONAL_COLUMNS = ("description",)
ALLOWED_COLUMNS = REQUIRED_COLUMNS + OPTIONAL_COLUMNS
BUILT_IN_CATEGORIES = ("Food", "Travel", "Shopping", "Education", "Entertainment", "Bills", "Health", "Other")
DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d")


def _text(value):
    return "" if value is None else str(value).strip()


def _amount(value):
    raw = _text(value).replace(",", "")
    for prefix in ("₹", "INR", "inr", "Rs.", "rs.", "RS.", "Rs", "rs", "RS"):
        if raw.startswith(prefix):
            raw = raw[len(prefix):].strip()
            break
    try:
        amount = Decimal(raw)
    except (InvalidOperation, ValueError):
        return None, "Amount must be a valid number."
    if not amount.is_finite():
        return None, "Amount must be a finite number."
    if amount <= 0:
        return None, "Amount must be greater than ₹0."
    if amount > Decimal("999999999.99"):
        return None, "Amount is too large."
    return float(amount.quantize(Decimal("0.01"))), None


def _date(value):
    raw = _text(value)
    if not raw:
        return None, "Date is required."
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date().isoformat(), None
        except ValueError:
            pass
    return None, "Date must use YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, or YYYY/MM/DD."


def _categories(custom_categories):
    lookup = {name.casefold(): (name, None) for name in BUILT_IN_CATEGORIES}
    for item in custom_categories or []:
        name = _text(item.get("name"))
        if name:
            lookup[name.casefold()] = (name, item.get("id"))
    return lookup


def expense_fingerprint(expense):
    return (
        _text(expense.get("name")).casefold(),
        round(float(expense.get("amount", 0)), 2),
        _text(expense.get("category")).casefold(),
        _text(expense.get("date")),
        _text(expense.get("description")).casefold(),
    )


def parse_and_validate_csv(file_bytes, custom_categories, existing_expenses):
    result = {"valid_rows": [], "invalid_rows": [], "duplicate_rows": [], "total_rows": 0, "extra_columns": [], "error": None}
    if not file_bytes:
        result["error"] = "The uploaded CSV is empty."
        return result
    if len(file_bytes) > 5 * 1024 * 1024:
        result["error"] = "The CSV is larger than the 5 MB import limit."
        return result
    try:
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        result["error"] = "The CSV must be UTF-8 encoded."
        return result

    try:
        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames is None:
            result["error"] = "The CSV does not contain a header row."
            return result
        headers = [_text(h).casefold() for h in reader.fieldnames if h is not None]
        if len(headers) != len(set(headers)):
            result["error"] = "The CSV contains duplicate column names."
            return result
        missing = [c for c in REQUIRED_COLUMNS if c not in headers]
        if missing:
            result["error"] = "Missing required column" + ("s: " if len(missing) > 1 else ": ") + ", ".join(missing)
            return result
        result["extra_columns"] = [h for h in headers if h not in ALLOWED_COLUMNS]

        categories = _categories(custom_categories)
        existing = {expense_fingerprint(e) for e in (existing_expenses or [])}
        seen_upload = set()

        for row_number, raw in enumerate(reader, start=2):
            if not any(_text(v) for v in raw.values()):
                continue
            result["total_rows"] += 1
            row = {_text(k).casefold(): _text(v) for k, v in raw.items() if k is not None}
            errors = []
            name = row.get("name", "")
            if not name:
                errors.append("Name is required.")
            elif len(name) > 200:
                errors.append("Name is too long (maximum 200 characters).")
            amount, err = _amount(row.get("amount"))
            if err:
                errors.append(err)
            raw_category = row.get("category", "")
            match = categories.get(raw_category.casefold())
            if not raw_category:
                errors.append("Category is required.")
                category, category_id = None, None
            elif match is None:
                errors.append(f"Unknown category '{raw_category}'. Use a built-in or existing custom category.")
                category, category_id = None, None
            else:
                category, category_id = match
            normalized_date, err = _date(row.get("date"))
            if err:
                errors.append(err)
            description = row.get("description", "")
            if len(description) > 1000:
                errors.append("Description is too long (maximum 1000 characters).")

            if errors:
                result["invalid_rows"].append({"row": row_number, "name": name, "amount": row.get("amount", ""), "category": raw_category, "date": row.get("date", ""), "description": description, "reason": " ".join(errors)})
                continue

            normalized = {"row": row_number, "name": name, "amount": amount, "category": category, "category_id": category_id, "date": normalized_date, "description": description}
            fingerprint = expense_fingerprint(normalized)
            if fingerprint in existing:
                reason = "Matches an existing SpendWise expense."
            elif fingerprint in seen_upload:
                reason = "Duplicate row within this CSV."
            else:
                reason = None
            if reason:
                duplicate = dict(normalized)
                duplicate["reason"] = reason
                result["duplicate_rows"].append(duplicate)
            else:
                seen_upload.add(fingerprint)
                result["valid_rows"].append(normalized)
    except csv.Error as error:
        result["error"] = f"The CSV could not be parsed: {error}"
    return result


def build_import_records(user_id, valid_rows):
    return [{
        "user_id": user_id,
        "name": row["name"],
        "amount": float(row["amount"]),
        "category": row["category"],
        "date": row["date"],
        "description": row.get("description", ""),
        "category_id": row.get("category_id"),
    } for row in valid_rows]
