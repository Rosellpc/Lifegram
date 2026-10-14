export async function withTimeout<T>(operation: Promise<T>, milliseconds = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("La operación tardó demasiado. Inténtalo de nuevo.")), milliseconds);
      }),
    ]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}
