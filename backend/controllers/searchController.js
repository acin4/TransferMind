import { search } from "../services/searchService.js";

export async function searchController(req, res) {
  const results = await search(req.query.q);
  res.status(200).json({ data: results });
}
