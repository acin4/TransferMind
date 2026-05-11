import json
import sys

import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder


def read_payload():
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid JSON input: {error.msg}") from error


def require_probability(value, field_name):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError(f"{field_name} must be a number.")

    parsed = float(value)

    if parsed <= 0 or parsed > 1:
        raise ValueError(f"{field_name} must be greater than 0 and at most 1.")

    return parsed


def require_positive_number(value, field_name):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError(f"{field_name} must be a number.")

    parsed = float(value)

    if parsed <= 0:
        raise ValueError(f"{field_name} must be greater than 0.")

    return parsed


def require_transactions(value):
    if not isinstance(value, list) or len(value) == 0:
        raise ValueError("transactions must be a non-empty array.")

    transactions = []

    for transaction_index, transaction in enumerate(value):
        if not isinstance(transaction, list) or len(transaction) == 0:
            raise ValueError(
                f"transactions[{transaction_index}] must be a non-empty array."
            )

        items = []

        for item_index, item in enumerate(transaction):
            if not isinstance(item, str) or item.strip() == "":
                raise ValueError(
                    f"transactions[{transaction_index}][{item_index}] "
                    "must be a non-empty string."
                )

            items.append(item.strip())

        transactions.append(sorted(set(items)))

    return transactions


def format_items(itemset):
    return sorted(itemset)


def build_rule_text(rule):
    antecedents = ",".join(rule["antecedents"])
    consequents = ",".join(rule["consequents"])
    return f"{antecedents}->{consequents}"


def build_transaction_frame(transactions):
    encoder = TransactionEncoder()
    encoded_transactions = encoder.fit(transactions).transform(transactions)
    return pd.DataFrame(encoded_transactions, columns=encoder.columns_)


def build_frequent_itemsets(transactions, min_support):
    transaction_frame = build_transaction_frame(transactions)
    return apriori(
        transaction_frame,
        min_support=min_support,
        use_colnames=True,
    )


def generate_rules(frequent_itemsets, min_confidence, min_lift):
    if frequent_itemsets.empty:
        return []

    rules_frame = association_rules(
        frequent_itemsets,
        metric="confidence",
        min_threshold=min_confidence,
    )

    if rules_frame.empty:
        return []

    rules = []
    seen_rules = set()

    for _, row in rules_frame.iterrows():
        antecedents = format_items(row["antecedents"])
        consequents = format_items(row["consequents"])
        rule_key = (tuple(antecedents), tuple(consequents))
        lift = float(row["lift"])

        if rule_key in seen_rules:
            continue

        seen_rules.add(rule_key)

        if min_lift is not None and lift < min_lift:
            continue

        rules.append(
            {
                "antecedents": antecedents,
                "consequents": consequents,
                "support": float(row["support"]),
                "confidence": float(row["confidence"]),
                "lift": lift,
            }
        )

    return sorted(
        rules,
        key=lambda rule: (
            -rule["lift"],
            -rule["confidence"],
            -rule["support"],
            build_rule_text(rule),
        ),
    )


def run(payload):
    transactions = require_transactions(payload.get("transactions"))
    min_support = require_probability(payload.get("minSupport"), "minSupport")
    min_confidence = require_probability(
        payload.get("minConfidence"),
        "minConfidence",
    )
    min_lift = None

    if "minLift" in payload and payload.get("minLift") is not None:
        min_lift = require_positive_number(payload.get("minLift"), "minLift")

    frequent_itemsets = build_frequent_itemsets(transactions, min_support)
    rules = generate_rules(
        frequent_itemsets,
        min_confidence,
        min_lift,
    )

    return {"rules": rules, "warnings": []}


def main():
    try:
        payload = read_payload()
        result = run(payload)
        sys.stdout.write(json.dumps(result, separators=(",", ":")))
    except Exception as error:
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
