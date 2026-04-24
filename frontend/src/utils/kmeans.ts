function squaredDistance(a: number[], b: number[]) {
  return a.reduce((total, value, index) => {
    const delta = value - (b[index] ?? 0);
    return total + delta * delta;
  }, 0);
}

function createInitialCentroids(points: number[][], k: number) {
  const centroids: number[][] = [points[0]];
  const used = new Set([0]);

  while (centroids.length < k && used.size < points.length) {
    let farthestIndex = -1;
    let farthestDistance = -1;

    points.forEach((point, index) => {
      if (used.has(index)) {
        return;
      }

      const nearestDistance = Math.min(
        ...centroids.map((centroid) => squaredDistance(point, centroid)),
      );

      if (nearestDistance > farthestDistance) {
        farthestDistance = nearestDistance;
        farthestIndex = index;
      }
    });

    if (farthestIndex === -1) {
      break;
    }

    used.add(farthestIndex);
    centroids.push(points[farthestIndex]);
  }

  while (centroids.length < k) {
    centroids.push(points[centroids.length % points.length]);
  }

  return centroids.map((centroid) => [...centroid]);
}

function assignPoints(points: number[][], centroids: number[][]) {
  return points.map((point) => {
    let nearestCentroidIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    centroids.forEach((centroid, index) => {
      const distance = squaredDistance(point, centroid);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestCentroidIndex = index;
      }
    });

    return nearestCentroidIndex;
  });
}

function recomputeCentroids(
  points: number[][],
  assignments: number[],
  previousCentroids: number[][],
  k: number,
) {
  const dimensions = points[0]?.length ?? 0;

  return Array.from({ length: k }, (_, clusterIndex) => {
    const clusterPoints = points.filter(
      (_, pointIndex) => assignments[pointIndex] === clusterIndex,
    );

    if (clusterPoints.length === 0) {
      return previousCentroids[clusterIndex] ?? Array(dimensions).fill(50);
    }

    return Array.from({ length: dimensions }, (_, dimensionIndex) => {
      const total = clusterPoints.reduce(
        (sum, point) => sum + (point[dimensionIndex] ?? 0),
        0,
      );

      return total / clusterPoints.length;
    });
  });
}

function haveAssignmentsChanged(previous: number[], next: number[]) {
  return previous.length !== next.length
    ? true
    : previous.some((value, index) => value !== next[index]);
}

export type KMeansResult = {
  assignments: number[];
  centroids: number[][];
  inertia: number;
  iterations: number;
};

export function runKMeans(points: number[][], requestedK: number): KMeansResult {
  if (points.length === 0) {
    return {
      assignments: [],
      centroids: [],
      inertia: 0,
      iterations: 0,
    };
  }

  const k = Math.max(1, Math.min(requestedK, points.length));
  let centroids = createInitialCentroids(points, k);
  let assignments = Array(points.length).fill(-1);
  let iterations = 0;

  for (let iteration = 0; iteration < 100; iteration += 1) {
    iterations = iteration + 1;

    const nextAssignments = assignPoints(points, centroids);

    if (!haveAssignmentsChanged(assignments, nextAssignments) && iteration > 0) {
      assignments = nextAssignments;
      break;
    }

    assignments = nextAssignments;
    centroids = recomputeCentroids(points, assignments, centroids, k);
  }

  const inertia = points.reduce((total, point, pointIndex) => {
    const centroid = centroids[assignments[pointIndex]] ?? centroids[0];
    return total + squaredDistance(point, centroid);
  }, 0);

  return {
    assignments,
    centroids,
    inertia,
    iterations,
  };
}
