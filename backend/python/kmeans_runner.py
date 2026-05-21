import json
import sys

from sklearn.cluster import KMeans


def read_payload():
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid JSON input: {error.msg}") from error


def require_number_matrix(value):
    if not isinstance(value, list) or len(value) == 0:
        raise ValueError("points must be a non-empty matrix.")

    expected_width = None
    matrix = []

    for row_index, row in enumerate(value):
        if not isinstance(row, list) or len(row) == 0:
            raise ValueError(f"points[{row_index}] must be a non-empty row.")

        if expected_width is None:
            expected_width = len(row)
        elif len(row) != expected_width:
            raise ValueError("All point rows must have the same length.")

        matrix_row = []

        for column_index, item in enumerate(row):
            if not isinstance(item, (int, float)):
                raise ValueError(
                    f"points[{row_index}][{column_index}] must be numeric."
                )

            matrix_row.append(float(item))

        matrix.append(matrix_row)

    return matrix


def require_integer(value, field_name, minimum=None, maximum=None):
    if not isinstance(value, int):
        raise ValueError(f"{field_name} must be an integer.")

    if minimum is not None and value < minimum:
        raise ValueError(f"{field_name} must be at least {minimum}.")

    if maximum is not None and value > maximum:
        raise ValueError(f"{field_name} must be at most {maximum}.")

    return value


def fit_kmeans(KMeans, points, k, random_state, max_iter):
    try:
        model = KMeans(
            n_clusters=k,
            random_state=random_state,
            max_iter=max_iter,
            n_init="auto",
        )
        return model.fit(points)
    except (TypeError, ValueError):
        pass

    model = KMeans(
        n_clusters=k,
        random_state=random_state,
        max_iter=max_iter,
        n_init=10,
    )
    return model.fit(points)


def run(payload):
    mode = payload.get("mode")
    points = require_number_matrix(payload.get("points"))
    random_state = require_integer(payload.get("randomState", 42), "randomState")
    max_iter = require_integer(payload.get("maxIter", 100), "maxIter", minimum=1)

    if mode == "elbow":
        max_k = require_integer(
            payload.get("maxK"),
            "maxK",
            minimum=1,
            maximum=len(points),
        )
        elbow = []

        for k in range(1, max_k + 1):
            model = fit_kmeans(KMeans, points, k, random_state, max_iter)
            elbow.append(
                {
                    "k": k,
                    "inertia": float(model.inertia_),
                    "iterations": int(model.n_iter_),
                }
            )

        return {"elbow": elbow}

    if mode == "cluster":
        k = require_integer(
            payload.get("k"),
            "k",
            minimum=2,
            maximum=len(points),
        )
        model = fit_kmeans(KMeans, points, k, random_state, max_iter)

        return {
            "assignments": [int(label) for label in model.labels_.tolist()],
            "centroids": model.cluster_centers_.astype(float).tolist(),
            "inertia": float(model.inertia_),
            "iterations": int(model.n_iter_),
        }

    raise ValueError('mode must be either "elbow" or "cluster".')


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
