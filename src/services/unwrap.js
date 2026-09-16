/**
 * The API envelope-wraps most payloads as { data: ... }, but not all of them.
 * This accepts either shape. It is the ONLY place that ambiguity is allowed to
 * live — if the contract is ever pinned down, this is the one function to
 * tighten.
 */
const unwrap = (response) => response?.data?.data ?? response?.data;

export default unwrap;
