export default function chunkArray<T>(input: T[], size: number) {
  const result = input.reduce((resultArray: T[][], item, index) => {
    const chunkIndex = Math.floor(index / size);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [] as T[]; // start a new chunk
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, []);

  return result;
}
