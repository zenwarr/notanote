async function makeInfallible<T>(x: Promise<T>): Promise<Error | undefined> {
  try {
    await x;
    return undefined;
  } catch (err: any) {
    return err;
  }
}


export function runParallelWithoutFailures(...tasks: Promise<void>[]): Promise<(Error | undefined)[]> {
  return Promise.all(tasks.map(makeInfallible));
}
