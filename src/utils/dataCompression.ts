/**
 * Data compression utilities for handling large payloads
 */

/**
 * Compress data using gzip algorithm
 */
export async function compressData(data: string): Promise<Uint8Array> {
  // In a browser environment, we can use CompressionStream API
  if (typeof window !== 'undefined' && 'CompressionStream' in window) {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(new TextEncoder().encode(data));
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    // Combine all chunks into a single Uint8Array
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }
  
  // Fallback for environments without CompressionStream
  console.warn('CompressionStream not available, returning uncompressed data');
  return new TextEncoder().encode(data);
}

/**
 * Decompress data using gzip algorithm
 */
export async function decompressData(compressedData: Uint8Array): Promise<string> {
  // In a browser environment, we can use DecompressionStream API
  if (typeof window !== 'undefined' && 'DecompressionStream' in window) {
    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(compressedData);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    // Combine all chunks and decode
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new TextDecoder().decode(result);
  }
  
  // Fallback for environments without DecompressionStream
  console.warn('DecompressionStream not available, returning data as-is');
  return new TextDecoder().decode(compressedData);
}

/**
 * Batch process large arrays to prevent memory issues
 */
export async function batchProcess<T, R>(
  items: T[], 
  processor: (item: T) => Promise<R>, 
  batchSize: number = 50
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    // Small delay to prevent blocking the main thread
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return results;
}

/**
 * Paginate large datasets
 */
export function paginateData<T>(data: T[], page: number, pageSize: number): {
  items: T[];
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
} {
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  return {
    items: data.slice(startIndex, endIndex),
    totalPages,
    totalItems,
    hasNext: page < totalPages,
    hasPrevious: page > 1
  };
}