import { Transform, TransformOptions } from 'node:stream';

export interface JSONReaderOptions extends TransformOptions {
  chunkedPattern: string;
}
export class JSONReader extends Transform {
  constructor(options: JSONReaderOptions);
}
