export class StorageError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public provider: string = 'unknown',
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class FileNotFoundError extends StorageError {
  constructor(path: string, provider: string) {
    super(`File not found at ${path}`, 404, provider);
    this.name = 'FileNotFoundError';
  }
}

export class FileTypeNotAllowedError extends StorageError {
  constructor(mimeType: string) {
    super(`File type ${mimeType} is not allowed`, 422, 'validation');
    this.name = 'FileTypeNotAllowedError';
  }
}

export class FileTooLargeError extends StorageError {
  constructor(size: number, maxSize: number) {
    super(
      `File size ${size} exceeds maximum of ${maxSize}`,
      422,
      'validation',
    );
    this.name = 'FileTooLargeError';
  }
}
