import io
import json
import math
import sys

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import (
    dendrogram,
    fcluster,
    linkage,
    set_link_color_palette,
)


ALLOWED_LINKAGES = {"ward", "complete", "average", "single"}
DENDROGRAM_FIGURE_BACKGROUND = "#0b1020"
DENDROGRAM_AXIS_BACKGROUND = "#0a1028"
DENDROGRAM_TEXT_COLOR = "#ffffff"
DENDROGRAM_AXIS_LINE_COLOR = (1, 1, 1, 0.6)
DENDROGRAM_GRID_COLOR = "#ffffff"
DENDROGRAM_GRID_ALPHA = 0.08
DENDROGRAM_CUT_LINE_COLOR = "#facc15"
DENDROGRAM_BRANCH_COLORS = [
    "#4ea1ff",
    "#ff9f43",
    "#34d399",
    "#f472b6",
    "#a78bfa",
    "#2dd4bf",
]


def read_payload():
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid JSON input: {error.msg}") from error


def require_number_matrix(value):
    if not isinstance(value, list) or len(value) == 0:
        raise ValueError("points must be a non-empty matrix.")

    if len(value) < 3:
        raise ValueError("points must include at least three rows.")

    expected_width = None

    for row_index, row in enumerate(value):
        if not isinstance(row, list) or len(row) == 0:
            raise ValueError(f"points[{row_index}] must be a non-empty row.")

        if len(row) < 2:
            raise ValueError("points must include at least two columns.")

        if expected_width is None:
            expected_width = len(row)
        elif len(row) != expected_width:
            raise ValueError("All point rows must have the same length.")

        for column_index, item in enumerate(row):
            if item is None:
                raise ValueError(
                    f"points[{row_index}][{column_index}] must not be null."
                )

            if not isinstance(item, (int, float)) or isinstance(item, bool):
                raise ValueError(
                    f"points[{row_index}][{column_index}] must be numeric."
                )

            if not math.isfinite(item):
                raise ValueError(
                    f"points[{row_index}][{column_index}] must be finite."
                )

    matrix = pd.DataFrame(value)

    if matrix.empty or matrix.shape[0] == 0 or matrix.shape[1] == 0:
        raise ValueError("points must produce a non-empty dataframe.")

    numeric_matrix = matrix.apply(pd.to_numeric, errors="coerce")

    if numeric_matrix.isna().all().all():
        raise ValueError("points must not be a NaN-only matrix.")

    nan_only_columns = [
        str(column)
        for column in numeric_matrix.columns
        if numeric_matrix[column].isna().all()
    ]

    if nan_only_columns:
        raise ValueError(
            f"points contains non-numeric columns: {', '.join(nan_only_columns)}."
        )

    if numeric_matrix.isna().any().any():
        raise ValueError("points must not contain NaN values.")

    values = numeric_matrix.to_numpy(dtype=float)

    if not np.isfinite(values).all():
        raise ValueError("points must contain only finite numeric values.")

    if (values < 0).any() or (values > 1).any():
        raise ValueError("points must contain normalized values between 0 and 1.")

    return numeric_matrix


def require_integer(value, field_name, minimum=None, maximum=None):
    if not isinstance(value, int) or isinstance(value, bool):
        raise ValueError(f"{field_name} must be an integer.")

    if minimum is not None and value < minimum:
        raise ValueError(f"{field_name} must be at least {minimum}.")

    if maximum is not None and value > maximum:
        raise ValueError(f"{field_name} must be at most {maximum}.")

    return value


def require_linkage(value):
    if value is None:
        return "ward"

    if not isinstance(value, str):
        raise ValueError("linkage must be a string.")

    normalized = value.strip().lower()

    if normalized not in ALLOWED_LINKAGES:
        raise ValueError(
            'linkage must be one of "ward", "complete", "average", or "single".'
        )

    return normalized


def require_labels(value, row_count):
    if value is None:
        return [f"Entry {index + 1}" for index in range(row_count)]

    if not isinstance(value, list) or len(value) != row_count:
        raise ValueError("labels must match the number of point rows.")

    labels = []

    for label_index, label in enumerate(value):
        if not isinstance(label, str) or label.strip() == "":
            labels.append(f"Entry {label_index + 1}")
            continue

        labels.append(label.strip())

    return labels


def to_zero_based_labels(cluster_labels):
    label_map = {
        label: index
        for index, label in enumerate(sorted(set(int(label) for label in cluster_labels)))
    }
    return [label_map[int(label)] for label in cluster_labels]


def get_cut_distance(linkage_matrix, cluster_count):
    distances = np.asarray(linkage_matrix, dtype=float)[:, 2]
    leaf_count = len(distances) + 1
    next_merge_index = leaf_count - cluster_count

    if next_merge_index <= 0:
        first_distance = float(distances[0])
        return first_distance / 2 if first_distance > 0 else 0.01

    if next_merge_index >= len(distances):
        last_distance = float(distances[-1])
        return last_distance * 1.05 if last_distance > 0 else 0.01

    lower_distance = float(distances[next_merge_index - 1])
    upper_distance = float(distances[next_merge_index])

    if upper_distance > lower_distance:
        return lower_distance + ((upper_distance - lower_distance) / 2)

    return upper_distance if upper_distance > 0 else 0.01


def build_dendrogram_svg(linkage_matrix, labels, linkage_method, cluster_count):
    width = max(8, min(18, len(labels) * 0.65))
    height = max(5, min(12, len(labels) * 0.35))
    cut_distance = get_cut_distance(linkage_matrix, cluster_count)
    figure, axis = plt.subplots(
        figsize=(width, height),
        facecolor=DENDROGRAM_FIGURE_BACKGROUND,
    )

    figure.patch.set_facecolor(DENDROGRAM_FIGURE_BACKGROUND)
    axis.set_facecolor(DENDROGRAM_AXIS_BACKGROUND)

    set_link_color_palette(DENDROGRAM_BRANCH_COLORS[1:])

    try:
        dendrogram(
            linkage_matrix,
            labels=labels,
            leaf_rotation=90,
            leaf_font_size=8,
            ax=axis,
            color_threshold=cut_distance,
            above_threshold_color=DENDROGRAM_BRANCH_COLORS[0],
        )
    finally:
        set_link_color_palette(None)

    axis.axhline(
        y=cut_distance,
        color=DENDROGRAM_CUT_LINE_COLOR,
        linewidth=1.8,
        linestyle=(0, (6, 4)),
        alpha=0.95,
        zorder=4,
    )
    axis.text(
        0.99,
        cut_distance,
        f"k = {cluster_count} cut",
        color=DENDROGRAM_CUT_LINE_COLOR,
        fontsize=9,
        fontweight="bold",
        ha="right",
        va="bottom",
        transform=axis.get_yaxis_transform(),
        bbox={
            "boxstyle": "round,pad=0.35",
            "facecolor": DENDROGRAM_AXIS_BACKGROUND,
            "edgecolor": DENDROGRAM_CUT_LINE_COLOR,
            "alpha": 0.88,
        },
        zorder=5,
    )

    axis.set_title(
        f"Agglomerative Clustering ({linkage_method}, k={cluster_count})",
        color=DENDROGRAM_TEXT_COLOR,
        fontweight="bold",
        pad=14,
    )
    axis.set_xlabel(
        "Team-season entries",
        color=DENDROGRAM_TEXT_COLOR,
        labelpad=14,
    )
    axis.set_ylabel("Merge distance", color=DENDROGRAM_TEXT_COLOR, labelpad=12)
    axis.tick_params(
        axis="both",
        color=DENDROGRAM_AXIS_LINE_COLOR,
        labelcolor=DENDROGRAM_TEXT_COLOR,
        width=1.1,
        grid_color=DENDROGRAM_GRID_COLOR,
        grid_alpha=DENDROGRAM_GRID_ALPHA,
    )
    axis.yaxis.grid(
        True,
        color=DENDROGRAM_GRID_COLOR,
        alpha=DENDROGRAM_GRID_ALPHA,
        linewidth=0.8,
        linestyle="-",
    )
    axis.xaxis.grid(False)
    axis.set_axisbelow(True)

    for tick_label in axis.get_xticklabels() + axis.get_yticklabels():
        tick_label.set_color(DENDROGRAM_TEXT_COLOR)

    for label in [axis.xaxis.label, axis.yaxis.label, axis.title]:
        label.set_color(DENDROGRAM_TEXT_COLOR)

    for spine in axis.spines.values():
        spine.set_color(DENDROGRAM_AXIS_LINE_COLOR)
        spine.set_linewidth(1.1)

    for collection in axis.collections:
        collection.set_linewidth(2.2)
        collection.set_antialiased(True)

    axis.margins(x=0.03, y=0.08)
    figure.tight_layout(pad=1.4)

    buffer = io.StringIO()
    figure.savefig(
        buffer,
        format="svg",
        bbox_inches="tight",
        facecolor=figure.get_facecolor(),
        edgecolor="none",
    )
    plt.close(figure)

    return buffer.getvalue()


def run(payload):
    points = require_number_matrix(payload.get("points"))
    k = require_integer(payload.get("k"), "k", minimum=2, maximum=len(points))
    linkage_method = require_linkage(payload.get("linkage"))
    labels = require_labels(payload.get("labels"), len(points))
    warnings = []
    point_values = points.to_numpy(dtype=float)
    linkage_matrix = linkage(point_values, method=linkage_method)
    cluster_labels = fcluster(linkage_matrix, t=k, criterion="maxclust")
    dendrogram_assignments = to_zero_based_labels(cluster_labels)
    actual_cluster_count = len(set(dendrogram_assignments))

    if actual_cluster_count < k:
        warnings.append(
            f"Agglomerative clustering produced {actual_cluster_count} "
            f"cluster groups after cutting the hierarchy at k={k}."
        )

    return {
        "assignments": dendrogram_assignments,
        "dendrogramSvg": build_dendrogram_svg(
            linkage_matrix,
            labels,
            linkage_method,
            k,
        ),
        "linkageMatrix": linkage_matrix.tolist(),
        "warnings": warnings,
    }


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
