export function count<T>(input: T[], predicate: (item: T) => boolean): number {
  let result = 0;
  for (const item of input) {
    if (predicate(item)) {
      result++;
    }
  }

  return result;
}
