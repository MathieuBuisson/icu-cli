export function handleHttpError(status: number, error?: unknown): never {
  if (status === 401) {
    process.stderr.write('Authentication failed. Check your credentials.\n');
  } else if (status === 403) {
    process.stderr.write('Access denied for this resource.\n');
  } else if (status === 404) {
    process.stderr.write('Resource not found.\n');
  } else if (error) {
    process.stderr.write(`Error: ${typeof error === 'string' ? error : JSON.stringify(error)}\n`);
  } else {
    process.stderr.write(`Error: HTTP ${status}\n`);
  }
  process.exit(1);
}
