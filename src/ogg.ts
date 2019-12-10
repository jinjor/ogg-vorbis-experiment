export function assertCapturePattern(v: DataView, p: number, expected: string) {
  let capture_pattern = "";
  for (let i = 0; i < expected.length; i++) {
    capture_pattern += String.fromCharCode(v.getUint8(p + i));
  }
  if (capture_pattern !== expected) {
    throw new Error(
      `Invalid capture_pattern: expected = "${expected}", actual = "${capture_pattern}"`
    );
  }
}

function concatSegments(segments: ArrayBuffer[]): ArrayBuffer {
  let totalLength = 0;
  for (let i = 0; i < segments.length; ++i) {
    totalLength += segments[i].byteLength;
  }
  let whole = new Uint8Array(totalLength);
  let offset = 0;
  for (let segment of segments) {
    whole.set(new Uint8Array(segment), offset);
    offset += segment.byteLength;
  }
  return whole.buffer;
}

export interface PacketReader {
  readPacket(buffer: ArrayBuffer): void;
}

class Stream<T extends PacketReader> {
  ended = false;
  segments: ArrayBuffer[] = [];
  constructor(public packetReader: T) {}
}

export class OggReader<T extends PacketReader> {
  streams = new Map<number, Stream<T>>();
  lastPage = -1;
  constructor(private createPacketReader: () => T) {}
  readPages(buffer: ArrayBuffer): void {
    const dataView = new DataView(buffer);
    let p = 0;
    while (p < dataView.byteLength) {
      p = this.readPage(dataView, p);
      this.lastPage++;
    }
  }
  readPage(v: DataView, p: number): number {
    assertCapturePattern(v, p, "OggS");
    p += 4;
    const stream_structure_version = v.getUint8(p++);
    if (stream_structure_version !== 0) {
      throw new Error(
        "Unsupported stream structure version: " + stream_structure_version
      );
    }
    /**
     *  1: continued packet
     *  2: first page of logical bitstream (bos)
     *  4: last page of logical bitstream (eos)
     */
    const header_type_flag = v.getUint8(p++);
    const absoluteGranulePosition =
      v.getUint32(p, true) * 2 ** 32 + v.getUint32(p + 4, true);
    p += 8;
    const streamSerialNumber = v.getUint32(p, true);
    p += 4;
    const pageSequenceNo = v.getUint32(p, true);
    p += 4;
    if (pageSequenceNo !== this.lastPage + 1) {
      throw new Error("Invalid pageSequenceNo: " + pageSequenceNo);
    }
    const pageCheckSum = v.getUint32(p, true);
    p += 4;
    const pageSegments = v.getUint8(p++);
    const segmentTable = [];
    for (let i = 0; i < pageSegments; i++) {
      segmentTable.push(v.getUint8(p++));
    }
    if (header_type_flag & 2) {
      const newStream = new Stream(this.createPacketReader());
      this.streams.set(streamSerialNumber, newStream);
    }
    const stream = this.streams.get(streamSerialNumber);
    if (header_type_flag & 1 && !stream.segments.length) {
      console.log(stream);
      throw new Error("The last page's seguments are not consumed.");
    }
    for (let i = 0; i < segmentTable.length; i++) {
      const segmentLength = segmentTable[i];
      stream.segments.push(v.buffer.slice(p, p + segmentLength));
      if (segmentLength < 255) {
        const packet = concatSegments(stream.segments);
        stream.packetReader.readPacket(packet);
        stream.segments = [];
      }
      p += segmentLength;
    }
    if (header_type_flag & 4) {
      stream.ended = true;
    }
    return p;
  }
}
